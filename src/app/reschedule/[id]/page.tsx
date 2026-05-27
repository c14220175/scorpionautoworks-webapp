"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CheckCircle2, Clock } from "lucide-react";

export default function ReschedulePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (id) fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (err: any) {
      toast.error("Gagal memuat data pesanan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      toast.error("Silakan pilih tanggal dan jam kedatangan Anda.");
      return;
    }

    setSubmitting(true);
    try {
      const newBookingDate = new Date(`${selectedDate}T${selectedTime}:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const selectedDay = new Date(newBookingDate);
      selectedDay.setHours(0, 0, 0, 0);

      // Jika hari ini -> status in_progress, jika masa depan -> scheduled
      const isToday = selectedDay.getTime() === today.getTime();
      const newStatus = isToday ? 'in_progress' : 'scheduled';

      const { error: dbError } = await supabase
        .from("bookings")
        .update({
          status: newStatus,
          booking_date: newBookingDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (dbError) throw dbError;

      setSuccess(true);
      toast.success("Jadwal kedatangan berhasil diperbarui!");
    } catch (err: any) {
      console.error(err);
      toast.error("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for min constraint
  const todayStr = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-pulse text-emerald-500 font-medium">Memuat data...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-rose-500 font-medium">Data pesanan tidak ditemukan.</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <Card className="w-full max-w-md bg-slate-900 border-emerald-500/50 shadow-emerald-900/20 text-center py-8">
          <CardContent className="flex flex-col items-center gap-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            <h2 className="text-2xl font-bold text-emerald-400">Jadwal Berhasil Diatur!</h2>
            <p className="text-slate-400">Silakan datang ke bengkel sesuai jadwal yang telah Anda pilih.</p>
            <Button onClick={() => router.push('/')} variant="outline" className="mt-4 border-emerald-500 text-emerald-500 hover:bg-emerald-950">
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-slate-200">
      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader className="border-b border-slate-800 pb-6 text-center">
          <CardTitle className="text-2xl font-bold text-emerald-500">Pilih Jadwal Kedatangan</CardTitle>
          <CardDescription className="text-slate-400 mt-2">
            Part inden Anda telah tiba. Silakan pilih jadwal untuk melanjutkan pengerjaan.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Order Info */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm">
            <div className="grid grid-cols-2 gap-y-2">
              <span className="text-slate-400">Atas Nama:</span>
              <span className="font-semibold text-right text-slate-200">{booking.customer_name}</span>
              <span className="text-slate-400">Layanan:</span>
              <span className="font-semibold text-right text-emerald-400">{booking.service_type}</span>
              <span className="text-slate-400">Kendaraan:</span>
              <span className="font-semibold text-right text-slate-200">{booking.vehicle_info}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  Tanggal Kedatangan
                </label>
                <Input
                  type="date"
                  min={todayStr}
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  Jam Kedatangan (08:00 - 16:00)
                </label>
                <Input
                  type="time"
                  required
                  min="08:00"
                  max="16:00"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-lg transition-all shadow-lg shadow-emerald-900/20"
              disabled={submitting}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </div>
              ) : (
                "Konfirmasi Jadwal"
              )}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
