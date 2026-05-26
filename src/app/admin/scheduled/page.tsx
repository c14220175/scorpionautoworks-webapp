"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatWIBFull, startOfDayWIB } from "@/utils/formatWIB";
import Link from "next/link";

export default function ScheduledPage() {
  const supabase = createClient();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledBookings();
  }, []);

  const fetchScheduledBookings = async () => {
    setLoading(true);
    try {
      const now = new Date();
      // Gunakan format lokal agar tidak terjadi pergeseran akibat konversi UTC
      const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const tYear = tomorrowDate.getFullYear();
      const tMonth = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
      const tDay = String(tomorrowDate.getDate()).padStart(2, '0');
      const tomorrowStart = startOfDayWIB(String(tYear), tMonth, tDay);

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['pending_approval', 'scheduled'])
        // Hanya tampilkan booking mulai dari besok ke depan (bukan hari ini)
        .gte('booking_date', tomorrowStart)
        .order('booking_date', { ascending: true });

      if (error) throw error;
      if (data) setReservations(data);
    } catch (error: any) {
      toast.error("Gagal mengambil data jadwal: " + error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-100">Jadwal Mendatang (Scheduled)</h1>
        <Button variant="outline" onClick={fetchScheduledBookings} className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
          Refresh Data
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center py-20 text-slate-500 animate-pulse">Memuat data jadwal...</div>
      ) : reservations.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800"><CardContent className="text-center py-20 text-slate-500">Tidak ada jadwal reservasi untuk hari-hari mendatang.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reservations.map((res) => (
            <Card key={res.id} className="bg-slate-900 border-slate-700 shadow-lg">
              <CardContent className="p-5 flex flex-col gap-2">
                <div className="flex justify-between w-full items-start">
                  <Badge className="bg-blue-600 text-white hover:bg-blue-700">
                    Scheduled
                  </Badge>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium bg-slate-800 px-2 py-1 rounded max-w-[120px] sm:max-w-none truncate sm:whitespace-normal">
                    {formatWIBFull(res.booking_date)}
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="text-lg font-bold text-slate-200">{res.customer_name}</h3>
                  <p className="text-blue-400 text-xs mb-1 font-medium">{res.service_type}</p>
                  <p className="text-slate-400 text-sm mt-1">{res.vehicle_info}</p>
                  {res.license_plate && (
                    <p className="text-sm mt-1 flex items-center gap-1.5">
                      <span className="text-slate-500 text-xs">Nopol:</span>
                      <span className="bg-slate-800 text-yellow-500 font-mono font-bold px-2 py-0.5 rounded text-xs tracking-wider border border-slate-700">{res.license_plate}</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tombol Navigasi ke Kelola Hari Tutup */}
      <div className="border-t border-slate-800 pt-6">
        <Card className="bg-gradient-to-r from-slate-900 to-slate-900/80 border-slate-700 hover:border-yellow-500/40 transition-all group">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:bg-rose-500/20 transition-colors mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200 group-hover:text-yellow-500 transition-colors">
                  Kelola Hari Tutup Bengkel
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  Atur tanggal-tanggal dimana bengkel tidak menerima booking dari pelanggan.
                </p>
              </div>
            </div>
            <Link href="/admin/closed-days">
              <Button className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold shadow-lg shadow-yellow-900/10 whitespace-nowrap">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Kelola Hari Tutup
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}