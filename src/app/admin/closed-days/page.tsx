"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";

type ClosedDay = {
  id: number;
  closed_date: string;
  reason: string | null;
  is_national_holiday: boolean;
  created_at: string;
};

type HolidayOverride = {
  id: number;
  override_date: string;
  original_holiday_name: string | null;
  created_at: string;
};

export default function ClosedDaysPage() {
  const supabase = createClient();

  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [holidayOverrides, setHolidayOverrides] = useState<HolidayOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Calendar state
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  // Public holidays from API: date string -> holiday name
  const [publicHolidays, setPublicHolidays] = useState<Record<string, string>>({});

  // Dialog state for adding a closed day
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isNationalHoliday, setIsNationalHoliday] = useState(false);

  // Dialog state for confirming delete
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dayToDelete, setDayToDelete] = useState<ClosedDay | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Dialog state for holiday override
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState<string>("");
  const [overrideHolidayName, setOverrideHolidayName] = useState<string>("");
  const [savingOverride, setSavingOverride] = useState(false);

  // Dialog state for removing holiday override
  const [isRemoveOverrideDialogOpen, setIsRemoveOverrideDialogOpen] = useState(false);
  const [overrideToRemove, setOverrideToRemove] = useState<HolidayOverride | null>(null);
  const [removingOverride, setRemovingOverride] = useState(false);

  useEffect(() => {
    fetchClosedDays();
    fetchHolidayOverrides();
  }, []);

  // Fetch public holidays from API when the viewed year changes
  useEffect(() => {
    const fetchPublicHolidays = async () => {
      try {
        const res = await fetch(`/api/holidays?year=${viewYear}`);
        const data = await res.json();

        const map: Record<string, string> = {};
        if (data.status === "success" && Array.isArray(data.data)) {
          data.data.forEach((h: { date: string; description: string }) => {
            map[h.date] = h.description;
          });
        }
        setPublicHolidays((prev) => ({ ...prev, ...map }));
      } catch (err) {
        console.error("Gagal memuat data hari libur nasional:", err);
      }
    };

    fetchPublicHolidays();
  }, [viewYear]);

  const fetchClosedDays = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("closed_days")
        .select("*")
        .order("closed_date", { ascending: true });

      if (error) throw error;
      if (data) setClosedDays(data);
    } catch (error: any) {
      toast.error("Gagal memuat data hari tutup: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidayOverrides = async () => {
    try {
      const { data, error } = await supabase
        .from("holiday_overrides")
        .select("*")
        .order("override_date", { ascending: true });

      if (error) throw error;
      if (data) setHolidayOverrides(data);
    } catch (error: any) {
      console.error("Gagal memuat data override hari libur:", error.message);
    }
  };

  // Create a Set of closed date strings for quick lookup
  const closedDateSet = useMemo(() => {
    return new Set(closedDays.map((d) => d.closed_date));
  }, [closedDays]);

  // Create a Set of overridden holiday dates for quick lookup
  const overrideDateSet = useMemo(() => {
    return new Set(holidayOverrides.map((o) => o.override_date));
  }, [holidayOverrides]);

  // Create a map of closed date -> reason for quick lookup
  const closedDateReasonMap = useMemo(() => {
    const map: Record<string, string> = {};
    closedDays.forEach((d) => {
      if (d.reason) map[d.closed_date] = d.reason;
    });
    return map;
  }, [closedDays]);

  // Get the label/reason for a date (public holiday name OR admin reason)
  const getDateLabel = useCallback(
    (dateStr: string): string | null => {
      // Priority 1: Admin custom closed reason
      if (closedDateReasonMap[dateStr]) return closedDateReasonMap[dateStr];
      // Priority 2: Public holiday name (if not overridden to open)
      if (publicHolidays[dateStr] && !overrideDateSet.has(dateStr)) return publicHolidays[dateStr];
      return null;
    },
    [publicHolidays, closedDateReasonMap, overrideDateSet]
  );

  // Calendar generation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const monthName = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
    new Date(viewYear, viewMonth, 1)
  );

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    // Padding for days before the 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [viewYear, viewMonth, daysInMonth, firstDayOfMonth]);

  const formatDateStr = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
  };

  const isToday = (day: number) => {
    return (
      viewYear === today.getFullYear() &&
      viewMonth === today.getMonth() &&
      day === today.getDate()
    );
  };

  const isPast = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart;
  };

  // Navigate months
  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  // Handle clicking a calendar day
  const handleDayClick = (day: number) => {
    const dateStr = formatDateStr(day);

    if (isPast(day)) {
      toast.error("Tidak bisa memilih tanggal yang sudah lewat.");
      return;
    }

    // If this date has an override, show remove-override dialog
    if (overrideDateSet.has(dateStr)) {
      const existing = holidayOverrides.find((o) => o.override_date === dateStr);
      if (existing) {
        setOverrideToRemove(existing);
        setIsRemoveOverrideDialogOpen(true);
      }
      return;
    }

    // If already a closed day in DB, show delete dialog
    if (closedDateSet.has(dateStr)) {
      const existing = closedDays.find((d) => d.closed_date === dateStr);
      if (existing) {
        setDayToDelete(existing);
        setIsDeleteDialogOpen(true);
      }
      return;
    }

    // If it's a public holiday (from API) and NOT overridden, show override dialog
    if (publicHolidays[dateStr]) {
      setOverrideDate(dateStr);
      setOverrideHolidayName(publicHolidays[dateStr]);
      setIsOverrideDialogOpen(true);
      return;
    }

    // Otherwise, open add-closed-day dialog
    setSelectedDate(dateStr);
    setReason("");
    setIsNationalHoliday(false);
    setIsAddDialogOpen(true);
  };

  // Save closed day
  const handleSaveClosedDay = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("closed_days").insert({
        closed_date: selectedDate,
        reason: reason.trim() || null,
        is_national_holiday: isNationalHoliday,
      });

      if (error) throw error;

      toast.success("Hari tutup berhasil ditambahkan!");
      setIsAddDialogOpen(false);
      setSelectedDate("");
      setReason("");
      setIsNationalHoliday(false);
      fetchClosedDays();
    } catch (error: any) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        toast.error("Tanggal ini sudah ditandai sebagai hari tutup.");
      } else {
        toast.error("Gagal menyimpan: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete closed day
  const handleDeleteClosedDay = async () => {
    if (!dayToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("closed_days")
        .delete()
        .eq("id", dayToDelete.id);

      if (error) throw error;

      toast.success("Hari tutup berhasil dihapus!");
      setIsDeleteDialogOpen(false);
      setDayToDelete(null);
      fetchClosedDays();
    } catch (error: any) {
      toast.error("Gagal menghapus: " + error.message);
    } finally {
      setDeleting(false);
    }
  };

  // Save holiday override (open on a public holiday)
  const handleSaveOverride = async () => {
    if (!overrideDate) return;
    setSavingOverride(true);
    try {
      const { error } = await supabase.from("holiday_overrides").insert({
        override_date: overrideDate,
        original_holiday_name: overrideHolidayName || null,
      });

      if (error) throw error;

      toast.success("Hari libur berhasil di-override! Bengkel akan BUKA di tanggal ini.");
      setIsOverrideDialogOpen(false);
      setOverrideDate("");
      setOverrideHolidayName("");
      fetchHolidayOverrides();
    } catch (error: any) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        toast.error("Tanggal ini sudah di-override sebelumnya.");
      } else {
        toast.error("Gagal menyimpan override: " + error.message);
      }
    } finally {
      setSavingOverride(false);
    }
  };

  // Remove holiday override
  const handleRemoveOverride = async () => {
    if (!overrideToRemove) return;
    setRemovingOverride(true);
    try {
      const { error } = await supabase
        .from("holiday_overrides")
        .delete()
        .eq("id", overrideToRemove.id);

      if (error) throw error;

      toast.success("Override dihapus! Tanggal ini kembali menjadi hari libur.");
      setIsRemoveOverrideDialogOpen(false);
      setOverrideToRemove(null);
      fetchHolidayOverrides();
    } catch (error: any) {
      toast.error("Gagal menghapus override: " + error.message);
    } finally {
      setRemovingOverride(false);
    }
  };

  // Format display date
  const formatDisplayDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  // Filter: only future or today closed days for the list
  const upcomingClosedDays = closedDays.filter((d) => {
    const [y, m, day] = d.closed_date.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date >= todayStart;
  });

  const pastClosedDays = closedDays.filter((d) => {
    const [y, m, day] = d.closed_date.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart;
  });

  // Upcoming overrides for the list
  const upcomingOverrides = holidayOverrides.filter((o) => {
    const [y, m, day] = o.override_date.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date >= todayStart;
  });

  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Kelola Hari Tutup</h1>
          <p className="text-slate-400 text-sm mt-1">
            Pilih tanggal di kalender untuk menandai bengkel tutup. Pelanggan tidak bisa booking di tanggal yang dipilih.
          </p>
        </div>
        <Link href="/admin/scheduled">
          <Button
            variant="outline"
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Scheduled
          </Button>
        </Link>
      </div>

      {/* Calendar Card */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
            <button
              onClick={goToPrevMonth}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-100 capitalize">
                {monthName} {viewYear}
              </h2>
              {(viewMonth !== today.getMonth() || viewYear !== today.getFullYear()) && (
                <button
                  onClick={goToCurrentMonth}
                  className="text-xs bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-2.5 py-1 rounded-full hover:bg-yellow-500/20 transition-colors"
                >
                  Hari Ini
                </button>
              )}
            </div>

            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day Names Header */}
          <div className="grid grid-cols-7 border-b border-slate-800">
            {dayNames.map((name, i) => (
              <div
                key={name}
                className={`text-center text-xs font-semibold py-3 ${
                  i === 0 ? "text-rose-400" : "text-slate-500"
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square border-b border-r border-slate-800/50" />;
              }

              const dateStr = formatDateStr(day);
              const isClosed = closedDateSet.has(dateStr);
              const isOverridden = overrideDateSet.has(dateStr) && !isClosed;
              const isTodayDate = isToday(day);
              const isPastDate = isPast(day);
              const isSunday = new Date(viewYear, viewMonth, day).getDay() === 0;
              const isApiHoliday = !!publicHolidays[dateStr];
              const isEffectiveHoliday = isApiHoliday && !isOverridden && !isClosed;
              const dateLabel = getDateLabel(dateStr);

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(day)}
                  disabled={isPastDate && !isClosed && !isOverridden}
                  title={
                    isOverridden
                      ? `✅ BUKA (Override: ${publicHolidays[dateStr] || "Hari Libur"})`
                      : dateLabel || undefined
                  }
                  className={`
                    aspect-square border-b border-r border-slate-800/50 relative
                    flex flex-col items-center justify-center gap-0.5 p-1 overflow-hidden
                    transition-all duration-150 group
                    ${isPastDate
                      ? "opacity-30 cursor-not-allowed"
                      : "cursor-pointer hover:bg-slate-800/80"
                    }
                    ${isClosed && !isPastDate
                      ? "bg-rose-950/40 hover:bg-rose-950/60"
                      : ""
                    }
                    ${isOverridden && !isPastDate
                      ? "bg-emerald-950/30 hover:bg-emerald-950/50 ring-1 ring-inset ring-emerald-500/30"
                      : ""
                    }
                    ${isEffectiveHoliday && !isClosed && !isPastDate
                      ? "bg-amber-950/20"
                      : ""
                    }
                    ${isTodayDate ? "ring-2 ring-inset ring-yellow-500/50" : ""}
                  `}
                >
                  <span
                    className={`
                      text-sm font-medium leading-none
                      ${isTodayDate ? "text-yellow-500 font-bold" : ""}
                      ${isClosed && !isPastDate && !isTodayDate ? "text-rose-400 font-bold" : ""}
                      ${isOverridden && !isClosed && !isTodayDate ? "text-emerald-400 font-bold" : ""}
                      ${isEffectiveHoliday && !isClosed && !isOverridden && !isTodayDate ? "text-rose-400/70 font-bold" : ""}
                      ${!isClosed && !isEffectiveHoliday && !isOverridden && !isTodayDate && isSunday ? "text-rose-400/70" : ""}
                      ${!isClosed && !isEffectiveHoliday && !isOverridden && !isTodayDate && !isSunday ? "text-slate-300" : ""}
                      ${isPastDate ? "text-slate-600" : ""}
                    `}
                  >
                    {day}
                  </span>

                  {/* Override label */}
                  {isOverridden && !isPastDate && (
                    <span className="text-[8px] leading-tight text-center max-w-full px-0.5 text-emerald-400/80 font-semibold">
                      BUKA
                    </span>
                  )}

                  {/* Holiday / Reason Label */}
                  {dateLabel && !isPastDate && !isOverridden && (
                    <span className={`
                      text-[9px] leading-tight text-center max-w-full px-0.5
                      line-clamp-2 break-words
                      ${isClosed ? "text-rose-400/80" : "text-amber-400/70"}
                    `}>
                      {dateLabel}
                    </span>
                  )}

                  {isClosed && !isPastDate && !dateLabel && !isOverridden && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  )}

                  {isTodayDate && !isClosed && !dateLabel && !isOverridden && (
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 border-t border-slate-800 bg-slate-950/50 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              Hari Ini
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              Bengkel Tutup
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/50" />
              Hari Libur Nasional
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/50 ring-1 ring-emerald-500/50" />
              Override (Buka)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-700" />
              Klik tanggal untuk toggle
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Overrides List */}
      {upcomingOverrides.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Override Hari Libur (Tetap Buka)
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30">
              {upcomingOverrides.length}
            </Badge>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingOverrides.map((override) => (
              <Card
                key={override.id}
                className="bg-slate-900 border-slate-800 hover:border-emerald-500/40 transition-all group"
              >
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] hover:bg-emerald-500/30">
                        BUKA
                      </Badge>
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] hover:bg-amber-500/20">
                        Override
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-200 capitalize">
                      {formatDisplayDate(override.override_date)}
                    </p>
                    {override.original_holiday_name && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        Libur asli: {override.original_holiday_name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setOverrideToRemove(override);
                      setIsRemoveOverrideDialogOpen(true);
                    }}
                    className="shrink-0 p-2 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Hapus override"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Closed Days List */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Daftar Hari Tutup Mendatang
          {upcomingClosedDays.length > 0 && (
            <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30">
              {upcomingClosedDays.length}
            </Badge>
          )}
        </h2>

        {loading ? (
          <div className="text-center py-12 text-slate-500 animate-pulse">Memuat data...</div>
        ) : upcomingClosedDays.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="text-center py-12 text-slate-500 flex flex-col items-center gap-2">
              <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Tidak ada hari tutup yang dijadwalkan. Bengkel buka setiap hari!</span>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingClosedDays.map((day) => (
              <Card
                key={day.id}
                className="bg-slate-900 border-slate-800 hover:border-rose-500/40 transition-all group"
              >
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px] hover:bg-rose-500/30">
                        TUTUP
                      </Badge>
                      {day.is_national_holiday && (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] hover:bg-amber-500/20">
                          🏛️ Libur Nasional
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-200 capitalize">
                      {formatDisplayDate(day.closed_date)}
                    </p>
                    {day.reason && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        Alasan: {day.reason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setDayToDelete(day);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="shrink-0 p-2 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Hapus hari tutup"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Closed Days (collapsed) */}
      {pastClosedDays.length > 0 && (
        <details className="group">
          <summary className="text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-400 transition-colors list-none flex items-center gap-2">
            <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Riwayat hari tutup yang sudah lewat ({pastClosedDays.length})
          </summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pastClosedDays.map((day) => (
              <Card key={day.id} className="bg-slate-900/50 border-slate-800/50 opacity-60">
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-slate-400 capitalize">
                    {formatDisplayDate(day.closed_date)}
                  </p>
                  {day.reason && (
                    <p className="text-xs text-slate-500 mt-0.5">{day.reason}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}

      {/* DIALOG: Tambah Hari Tutup */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!saving) setIsAddDialogOpen(open); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-yellow-500 text-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tandai Hari Tutup
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-slate-500 text-xs mb-1">Tanggal yang dipilih</div>
              <div className="text-slate-200 font-semibold capitalize">
                {selectedDate ? formatDisplayDate(selectedDate) : "-"}
              </div>
            </div>

            {/* Toggle Hari Libur Nasional */}
            <div
              className={`rounded-xl p-4 border cursor-pointer transition-all ${
                isNationalHoliday
                  ? "bg-amber-500/10 border-amber-500/40"
                  : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
              }`}
              onClick={() => setIsNationalHoliday(!isNationalHoliday)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-xl ${isNationalHoliday ? "" : "grayscale opacity-50"}`}>🏛️</div>
                  <div>
                    <div className={`text-sm font-semibold ${isNationalHoliday ? "text-amber-400" : "text-slate-400"}`}>
                      Hari Libur Nasional
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Tandai ini sebagai hari libur nasional
                    </div>
                  </div>
                </div>
                {/* Toggle Switch */}
                <div className={`
                  w-11 h-6 rounded-full transition-colors duration-200 relative
                  ${isNationalHoliday ? "bg-amber-500" : "bg-slate-700"}
                `}>
                  <div className={`
                    w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform duration-200
                    ${isNationalHoliday ? "translate-x-[22px]" : "translate-x-0.5"}
                  `} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400">
                Alasan Tutup <span className="text-slate-600 font-normal">(opsional)</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isNationalHoliday ? "Contoh: Hari Raya Idul Fitri, Natal, dll..." : "Contoh: Renovasi bengkel, Cuti bersama, dll..."}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={saving}
                className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveClosedDay}
                disabled={saving}
                className="bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20 px-6"
              >
                {saving ? "Menyimpan..." : "Tandai Tutup"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Konfirmasi Hapus Hari Tutup */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!deleting) setIsDeleteDialogOpen(open); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-500 text-lg">Hapus Hari Tutup?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-slate-400 text-sm">
              Hari tutup berikut akan dihapus dan bengkel akan kembali menerima booking di tanggal ini:
            </p>
            {dayToDelete && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="text-slate-200 font-semibold capitalize">
                  {formatDisplayDate(dayToDelete.closed_date)}
                </div>
                {dayToDelete.reason && (
                  <div className="text-slate-400 text-sm mt-1">Alasan: {dayToDelete.reason}</div>
                )}
                {dayToDelete.is_national_holiday && (
                  <div className="text-amber-400 text-xs mt-1 flex items-center gap-1">
                    🏛️ Ditandai sebagai Hari Libur Nasional
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => { setIsDeleteDialogOpen(false); setDayToDelete(null); }}
                disabled={deleting}
                className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Batal
              </Button>
              <Button
                onClick={handleDeleteClosedDay}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20 px-6"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Override Hari Libur (Buka Bengkel) */}
      <Dialog open={isOverrideDialogOpen} onOpenChange={(open) => { if (!savingOverride) setIsOverrideDialogOpen(open); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-500 text-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Override Hari Libur
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="text-amber-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                </svg>
                Tanggal ini adalah Hari Libur Nasional
              </div>
              <div className="text-slate-200 font-semibold capitalize">
                {overrideDate ? formatDisplayDate(overrideDate) : "-"}
              </div>
              {overrideHolidayName && (
                <div className="text-amber-400/80 text-sm mt-1">{overrideHolidayName}</div>
              )}
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-emerald-400 text-sm">
                Dengan meng-override, bengkel akan <strong>TETAP BUKA</strong> di tanggal ini meskipun API menandainya sebagai hari libur nasional. Pelanggan akan bisa melakukan booking.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOverrideDialogOpen(false);
                  setSelectedDate(overrideDate);
                  setReason(overrideHolidayName);
                  setIsNationalHoliday(true);
                  // Slight delay to avoid dialog flash
                  setTimeout(() => setIsAddDialogOpen(true), 150);
                }}
                disabled={savingOverride}
                className="bg-transparent border-rose-500/50 text-rose-400 hover:bg-rose-500/10 mr-auto"
              >
                Tandai Tutup Manual
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsOverrideDialogOpen(false)}
                disabled={savingOverride}
                className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveOverride}
                disabled={savingOverride}
                className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 px-6"
              >
                {savingOverride ? "Menyimpan..." : "Ya, Tetap Buka"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Hapus Override */}
      <Dialog open={isRemoveOverrideDialogOpen} onOpenChange={(open) => { if (!removingOverride) setIsRemoveOverrideDialogOpen(open); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-500 text-lg">Hapus Override?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-slate-400 text-sm">
              Override ini akan dihapus dan tanggal ini kembali menjadi hari libur nasional. Bengkel akan tutup dan pelanggan tidak bisa booking di tanggal ini.
            </p>
            {overrideToRemove && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="text-slate-200 font-semibold capitalize">
                  {formatDisplayDate(overrideToRemove.override_date)}
                </div>
                {overrideToRemove.original_holiday_name && (
                  <div className="text-amber-400 text-sm mt-1">
                    Hari libur: {overrideToRemove.original_holiday_name}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRemoveOverrideDialogOpen(false);
                  if (overrideToRemove) {
                    setSelectedDate(overrideToRemove.override_date);
                    setReason(overrideToRemove.original_holiday_name || "");
                    setIsNationalHoliday(true);
                    // Slight delay to avoid dialog flash
                    setTimeout(() => setIsAddDialogOpen(true), 150);
                  }
                }}
                disabled={removingOverride}
                className="bg-transparent border-rose-500/50 text-rose-400 hover:bg-rose-500/10 mr-auto"
              >
                Tandai Tutup Manual
              </Button>
              <Button
                variant="outline"
                onClick={() => { setIsRemoveOverrideDialogOpen(false); setOverrideToRemove(null); }}
                disabled={removingOverride}
                className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Batal
              </Button>
              <Button
                onClick={handleRemoveOverride}
                disabled={removingOverride}
                className="bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20 px-6"
              >
                {removingOverride ? "Menghapus..." : "Ya, Hapus Override"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
