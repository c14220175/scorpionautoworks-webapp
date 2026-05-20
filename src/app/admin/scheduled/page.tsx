"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatWIBFull, startOfDayWIB } from "@/utils/formatWIB";

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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}