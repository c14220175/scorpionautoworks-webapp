"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatWIB, startOfDayWIB, endOfDayWIB } from "@/utils/formatWIB";

export default function AdminDashboard() {
  const supabase = createClient();
  
  const [reservations, setReservations] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]); 
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [selectedRes, setSelectedRes] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [resToDelete, setResToDelete] = useState<number | null>(null);

  // State untuk popup alasan pembatalan
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // State untuk popup "Ada keluhan lain?"
  const [isExtraComplaintOpen, setIsExtraComplaintOpen] = useState(false);
  const [showExtraInput, setShowExtraInput] = useState(false);
  const [extraComplaint, setExtraComplaint] = useState('');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Menjalankan Timer untuk Jam & Fetch Data
  useEffect(() => {
    fetchDashboardData();
    setCurrentTime(new Date());
    // Update setiap detik
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Data Reservasi Hari Ini
      const now = new Date();
      // Gunakan format WIB (+07:00) agar tidak terjadi pergeseran akibat konversi UTC
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const startOfToday = startOfDayWIB(String(year), month, day);
      const endOfToday = endOfDayWIB(String(year), month, day);

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        // Tampilkan reservasi hari ini dengan status pending_approval ATAU scheduled
        .in('status', ['pending_approval', 'scheduled'])
        // Filter: >= 00:00:00 hari ini
        .gte('booking_date', startOfToday)
        // Filter: <= 23:59:59 hari ini
        .lte('booking_date', endOfToday)
        // Urutkan dari jam paling pagi ke malam
        .order('booking_date', { ascending: true });

      if (bookingError) throw bookingError;
      if (bookingData) setReservations(bookingData);

      // Fetch inventory: kategori Fast Moving Parts, stock_count = 1 (hampir habis)
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('name, stock_count')
        .eq('category', 'Fast Moving Parts')
        .eq('stock_count', 1); 

      if (invError) throw invError;
      if (invData) setLowStockItems(invData);

    } catch (error: any) {
      toast.error("Gagal memuat data dashboard: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Buka dialog alasan pembatalan
  const openCancelDialog = () => {
    setCancelReason('');
    setIsCancelDialogOpen(true);
  };

  // Eksekusi pembatalan: kirim email + hapus dari DB
  const executeCancellation = async () => {
    if (!selectedRes || !cancelReason.trim()) return;
    setActionLoading(true);
    try {
      // 1. Kirim email pembatalan ke pelanggan
      if (selectedRes.customer_email) {
        try {
          await fetch('/api/send-cancellation-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerName: selectedRes.customer_name,
              customerEmail: selectedRes.customer_email,
              vehicleInfo: selectedRes.vehicle_info,
              vehicleYear: selectedRes.vehicle_year || '-',
              serviceType: selectedRes.service_type,
              bookingDate: selectedRes.booking_date,
              cancellationReason: cancelReason.trim(),
            }),
          });
        } catch (emailErr) {
          console.error('Gagal mengirim email pembatalan:', emailErr);
          // Tetap lanjut hapus meskipun email gagal
        }
      }

      // 2. Hapus foto dari storage jika ada
      if (selectedRes.photo_url) {
        try {
          const url = new URL(selectedRes.photo_url);
          const pathParts = url.pathname.split('/service-evidence/');
          if (pathParts.length > 1) {
            const fileName = pathParts[1];
            await supabase.storage.from('service-evidence').remove([fileName]);
          }
        } catch (removeErr) {
          console.error('Gagal menghapus foto dari storage:', removeErr);
        }
      }

      // 3. Hapus reservasi dari database
      const { error } = await supabase.from('bookings').delete().eq('id', selectedRes.id);
      if (error) throw error;
      
      toast.success("Reservasi berhasil dibatalkan. Email notifikasi telah dikirim ke pelanggan.");
      setIsCancelDialogOpen(false);
      setIsDetailOpen(false);
      setSelectedRes(null);
      fetchDashboardData();
    } catch (error: any) {
      toast.error("Gagal membatalkan reservasi: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!resToDelete) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', resToDelete);
      if (error) throw error;
      
      toast.success("Data reservasi berhasil dihapus.");
      setIsDetailOpen(false);
      setSelectedRes(null);
      fetchDashboardData();
    } catch (error: any) {
      toast.error("Gagal menghapus data: " + error.message);
    } finally {
      setActionLoading(false);
      setResToDelete(null);
      setIsAlertOpen(false);
    }
  };

  // Membuka popup "Ada keluhan lain?" saat Start Progress diklik
  const openExtraComplaintDialog = () => {
    setExtraComplaint('');
    setShowExtraInput(false);
    setIsExtraComplaintOpen(true);
  };

  // Generate kode pelacakan 6 karakter alfanumerik unik
  const generateTrackingCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleStartProgress = async (additionalComplaint?: string) => {
    if (!selectedRes) return;
    setActionLoading(true);
    try {
      const trackingCode = generateTrackingCode();
      const updateData: any = { status: 'in_progress', photo_url: null, tracking_code: trackingCode, updated_at: new Date().toISOString() };

      // Jika ada keluhan tambahan, gabungkan dengan keluhan yang sudah ada
      if (additionalComplaint && additionalComplaint.trim()) {
        const existingDesc = selectedRes.problem_description || '';
        updateData.problem_description = `${existingDesc}\n\n[Keluhan Tambahan]: ${additionalComplaint.trim()}`;
      }

      const { error } = await supabase.from('bookings').update(updateData).eq('id', selectedRes.id);
      if (error) throw error;

      // Hapus foto dari Supabase Storage untuk menghemat memori
      if (selectedRes.photo_url) {
        try {
          const url = new URL(selectedRes.photo_url);
          // Path format: /storage/v1/object/public/service-evidence/filename
          const pathParts = url.pathname.split('/service-evidence/');
          if (pathParts.length > 1) {
            const fileName = pathParts[1];
            await supabase.storage.from('service-evidence').remove([fileName]);
          }
        } catch (removeErr) {
          console.error('Gagal menghapus foto dari storage:', removeErr);
          // Tidak fatal, booking tetap lanjut
        }
      }
      // Send Email Notification (dengan tracking code)
      if (selectedRes.customer_email) {
        try {
          const isCheckup = selectedRes.service_type?.toLowerCase().includes("pengecekan") || selectedRes.service_type?.toLowerCase().includes("checkup");
          const initialPhase = isCheckup ? "Pengecekan awal" : "Melepas komponen lama (Menunggu Sparepart)";
          
          await fetch('/api/send-service-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerName: selectedRes.customer_name,
              customerEmail: selectedRes.customer_email,
              vehicleInfo: selectedRes.vehicle_info,
              vehicleYear: selectedRes.vehicle_year || '-',
              serviceType: selectedRes.service_type,
              currentPhase: initialPhase,
              isCompleted: false,
              trackingCode: trackingCode,
            }),
          });
        } catch (emailErr) {
          console.error("Gagal mengirim email notifikasi:", emailErr);
        }
      }
      
      toast.success("Progres dimulai! Data dipindahkan ke daftar Ongoing.");
      setIsExtraComplaintOpen(false);
      setIsDetailOpen(false);
      setSelectedRes(null);
      fetchDashboardData();
    } catch (error: any) {
      toast.error("Gagal memulai progres: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Format Helper: Real-time Clock (selalu WIB)
  const formatCurrentTime = (date: Date | null) => {
    if (!date) return "Memuat waktu...";
    const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('id-ID', { ...opts, timeZone: 'Asia/Jakarta' }).format(date);
    return `Hari ini: ${fmt({ weekday: 'long' })}, ${fmt({ day: 'numeric' })}, ${fmt({ month: 'long' })}, ${fmt({ hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  const openDetailModal = (res: any) => {
    setSelectedRes(res);
    setIsDetailOpen(true);
  };

  const triggerDeleteAlert = (id: number) => {
    setResToDelete(id);
    setIsAlertOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Tampilan Jam */}
      <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-yellow-500 shadow-sm rounded-xl">
        <CardContent className="p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-yellow-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-slate-300 font-mono tracking-wide text-sm md:text-base">
            {formatCurrentTime(currentTime)}
          </span>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-100">Jadwal Servis Hari Ini</h1>
        <Button variant="outline" onClick={fetchDashboardData} className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
          Refresh Data
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center py-20 text-slate-500 animate-pulse">Memuat data dari database...</div>
      ) : reservations.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800"><CardContent className="text-center py-20 text-slate-500">Tidak ada jadwal reservasi untuk hari ini.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reservations.map((res) => (
            <Card key={res.id} onClick={() => openDetailModal(res)} className="bg-slate-900 border-slate-800 hover:border-yellow-500/50 cursor-pointer transition-all group">
              <CardContent className="p-5 flex flex-col gap-2">
                <div className="flex justify-between items-start w-full">
                  <Badge className="bg-yellow-500 text-slate-900 hover:bg-yellow-600 font-semibold">Hari Ini</Badge>
                  <span className="text-xs text-slate-500 font-medium">ID: {res.id}</span>
                </div>
                <div className="mt-2">
                  <h3 className="text-lg font-bold text-slate-200 line-clamp-1">{res.customer_name || 'Pelanggan'}</h3>
                  <p className="text-yellow-500 text-xs mb-1 font-medium">{res.service_type}</p>
                  <p className="text-slate-400 text-sm mt-1 line-clamp-2">{res.problem_description}</p>
                </div>
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-2 border-t border-slate-800 pt-3">
                  <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {formatWIB(res.booking_date)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* NOTIFIKASI STOK HAMPIR HABIS DI BAWAH HOMEPAGE */}
      {!loading && lowStockItems.length > 0 && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-rose-950/30 border-rose-900/50">
            <CardContent className="p-5 flex flex-col gap-3">
              {lowStockItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-rose-500 font-semibold border-b border-rose-900/50 pb-2 last:border-0 last:pb-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>Stok hampir habis: {item.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SHADCN DIALOG: Detail Reservasi */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-yellow-500 text-xl">Detail Reservasi</DialogTitle></DialogHeader>
          {selectedRes && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div className="md:col-span-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <div className="text-slate-500 text-xs mb-1">Nama Pelanggan</div>
                  <div className="font-semibold text-slate-200">{selectedRes.customer_name || '-'}</div>
                  <div className="text-slate-500 text-xs mt-2 mb-1">Email</div>
                  <div className="font-semibold text-slate-200">{selectedRes.customer_email || '-'}</div>
                  <div className="text-slate-500 text-xs mt-2 mb-1">Nomor Telepon</div>
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {selectedRes.customer_phone ? (
                      <a href={`tel:${selectedRes.customer_phone}`} className="hover:text-yellow-500 transition-colors">{selectedRes.customer_phone}</a>
                    ) : '-'}
                  </div>
                </div>
                {selectedRes.license_plate && (
                  <div className="md:col-span-2 bg-slate-800/50 p-3 rounded-lg border border-yellow-500/20">
                    <div className="text-slate-500 text-xs mb-1">Nomor Polisi</div>
                    <div className="font-bold text-yellow-500 font-mono tracking-wider text-lg">{selectedRes.license_plate}</div>
                  </div>
                )}
                <div><div className="text-slate-500 text-xs mb-1">ID Reservasi</div><div className="font-semibold text-slate-200">{selectedRes.id}</div></div>
                <div><div className="text-slate-500 text-xs mb-1">Waktu Masuk</div><div className="font-semibold text-yellow-500 text-base">{formatWIB(selectedRes.booking_date)}</div></div>
                <div><div className="text-slate-500 text-xs mb-1">Tipe Servis</div><div className="font-semibold text-slate-200">{selectedRes.service_type}</div></div>
                <div><div className="text-slate-500 text-xs mb-1">Tahun Kendaraan</div><div className="font-semibold text-slate-200">{selectedRes.vehicle_year || '-'}</div></div>
                <div className="md:col-span-2">
                  <div className="text-slate-500 text-xs mb-1">Data Kendaraan & Keluhan</div>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-slate-300">
                    <span className="text-yellow-500 block mb-1 font-medium">{selectedRes.vehicle_info}</span>
                    {selectedRes.problem_description}
                  </div>
                </div>

                {selectedRes.photo_url && (
                  <div className="md:col-span-2">
                    <div className="text-slate-500 text-xs mb-2">Foto Bukti Keluhan</div>
                    <img src={selectedRes.photo_url} alt="Bukti Keluhan" className="w-full h-auto max-h-48 object-cover rounded-lg border border-slate-700" />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 border-t border-slate-800 pt-4 mt-2">
            <Button variant="destructive" onClick={openCancelDialog} disabled={actionLoading}>Batalkan Reservasi</Button>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsDetailOpen(false)} disabled={actionLoading} className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Tutup</Button>
              <Button onClick={openExtraComplaintDialog} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20">
                {actionLoading ? 'Memproses...' : 'Start Progress'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SHADCN ALERT DIALOG: Konfirmasi Hapus */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-500">Hapus Data Reservasi?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Tindakan ini tidak dapat dibatalkan. Data reservasi akan dihapus secara permanen dari server database kami.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-rose-600 hover:bg-rose-500 text-white">Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG: Alasan Pembatalan Reservasi */}
      <Dialog open={isCancelDialogOpen} onOpenChange={(open) => { if (!actionLoading) { setIsCancelDialogOpen(open); setCancelReason(''); } }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-500 text-lg">Batalkan Reservasi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-slate-400 text-sm">
              Tuliskan alasan pembatalan reservasi. Alasan ini akan dikirimkan ke email pelanggan (<span className="text-slate-300 font-medium">{selectedRes?.customer_email || '-'}</span>).
            </p>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400">Alasan Pembatalan <span className="text-rose-500">*</span></label>
              <textarea
                rows={4}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Slot jadwal penuh untuk hari tersebut, silakan reschedule ke hari lain..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => { setIsCancelDialogOpen(false); setCancelReason(''); }}
                disabled={actionLoading}
                className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Kembali
              </Button>
              <Button
                onClick={executeCancellation}
                disabled={actionLoading || !cancelReason.trim()}
                className="bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20 px-6"
              >
                {actionLoading ? 'Memproses...' : 'Konfirmasi Batalkan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Ada Keluhan Lain? */}
      <Dialog open={isExtraComplaintOpen} onOpenChange={(open) => { if (!actionLoading) { setIsExtraComplaintOpen(open); setShowExtraInput(false); setExtraComplaint(''); } }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-yellow-500 text-lg">Ada Keluhan Lain?</DialogTitle>
          </DialogHeader>

          {!showExtraInput ? (
            // Step 1: Tanya Ya / Tidak
            <div className="space-y-4 py-2">
              <p className="text-slate-400 text-sm">Apakah pelanggan memiliki keluhan tambahan selain yang sudah tertulis?</p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleStartProgress()}
                  disabled={actionLoading}
                  className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 px-6"
                >
                  {actionLoading ? 'Memproses...' : 'Tidak'}
                </Button>
                <Button
                  onClick={() => setShowExtraInput(true)}
                  disabled={actionLoading}
                  className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-semibold px-6"
                >
                  Ya
                </Button>
              </div>
            </div>
          ) : (
            // Step 2: Input keluhan tambahan
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400">Tuliskan keluhan tambahan:</label>
                <textarea
                  rows={3}
                  value={extraComplaint}
                  onChange={(e) => setExtraComplaint(e.target.value)}
                  placeholder="Contoh: Bunyi berdecit saat belok kanan..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => { setShowExtraInput(false); setExtraComplaint(''); }}
                  disabled={actionLoading}
                  className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Kembali
                </Button>
                <Button
                  onClick={() => handleStartProgress(extraComplaint)}
                  disabled={actionLoading || !extraComplaint.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 px-6"
                >
                  {actionLoading ? 'Memproses...' : 'Tambah & Mulai'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}