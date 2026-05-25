"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, FileText, CheckCircle2 } from "lucide-react";

export default function PaymentPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Format file tidak didukung. Harap unggah gambar atau PDF.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar. Maksimal 5MB.");
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Silakan pilih file bukti transfer terlebih dahulu.");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `dp/${fileName}`; // optional folder inside bucket

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(filePath);

      // 3. Update Database
      const { error: dbError } = await supabase
        .from("bookings")
        .update({
          dp_status: "awaiting_verification",
          dp_proof_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (dbError) throw dbError;

      toast.success("Bukti transfer berhasil diunggah! Menunggu verifikasi admin.");
      fetchBooking(); // Refresh data to show updated status
      setFile(null); // Clear file
    } catch (err: any) {
      console.error(err);
      toast.error("Terjadi kesalahan saat mengunggah: " + err.message);
    } finally {
      setUploading(false);
    }
  };

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
        <div className="text-rose-500 font-medium">Pesanan tidak ditemukan.</div>
      </div>
    );
  }

  // If already verified or awaiting verification, show status instead of form
  if (booking.dp_status === 'verified') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <Card className="w-full max-w-md bg-slate-900 border-emerald-500/50 shadow-emerald-900/20 text-center py-8">
          <CardContent className="flex flex-col items-center gap-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            <h2 className="text-2xl font-bold text-emerald-400">Pembayaran Berhasil Diverifikasi!</h2>
            <p className="text-slate-400">Terima kasih, DP pesanan Anda telah kami terima.</p>
            <Button onClick={() => router.push('/')} variant="outline" className="mt-4 border-emerald-500 text-emerald-500 hover:bg-emerald-950">
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  let dpAmount = 0;
  if (booking) {
    const invoiceItems = booking.invoice_data?.items || [];
    const estimationItems = booking.estimation_data?.items || [];
    const parsedItems = [...invoiceItems, ...estimationItems];
    dpAmount = parsedItems.filter((i: any) => i.type === 'Part-Inden').reduce((sum: number, item: any) => sum + (Math.round((item.price * item.qty) / 2)), 0);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-slate-200">
      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader className="border-b border-slate-800 pb-6 text-center">
          <CardTitle className="text-2xl font-bold text-emerald-500">Pembayaran DP</CardTitle>
          <CardDescription className="text-slate-400 mt-2">
            Silakan lakukan pembayaran DP untuk mengonfirmasi pesanan Anda.
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
              {dpAmount > 0 && (
                <>
                  <span className="text-slate-400 mt-2">Total DP:</span>
                  <span className="font-bold text-right text-lg text-emerald-500 mt-2">Rp {dpAmount.toLocaleString('id-ID')}</span>
                </>
              )}
            </div>
          </div>

          {/* Bank Account Info */}
          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-5 text-center space-y-2">
            <p className="text-sm text-slate-300">Transfer ke Rekening Bank BCA</p>
            <p className="text-3xl font-mono font-bold tracking-wider text-white">8725 1100 70</p>
            <p className="text-sm font-medium text-emerald-400">a/n WILLIAM</p>
          </div>

          {/* Status Message */}
          {booking.dp_status === 'awaiting_verification' && (
            <div className="bg-amber-950/40 border border-amber-900/50 rounded-xl p-4 text-center">
              <p className="text-amber-500 font-medium text-sm">Bukti transfer sedang menunggu verifikasi admin.</p>
              <p className="text-xs text-slate-400 mt-1">Anda dapat mengunggah ulang jika terdapat kesalahan.</p>
            </div>
          )}

          {booking.dp_status === 'rejected' && (
            <div className="bg-rose-950/40 border border-rose-900/50 rounded-xl p-4 text-center">
              <p className="text-rose-500 font-medium text-sm">Bukti transfer sebelumnya DITOLAK.</p>
              <p className="text-xs text-rose-400/80 mt-1">Mohon pastikan foto/dokumen jelas dan sesuai, lalu unggah ulang.</p>
            </div>
          )}

          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Unggah Bukti Transfer (Image / PDF)</Label>
              <div className="relative">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                    ${file ? 'border-emerald-500 bg-emerald-950/20' : 'border-slate-700 hover:border-slate-500 bg-slate-950/50'}
                  `}
                >
                  {file ? (
                    <div className="flex flex-col items-center text-emerald-500">
                      <FileText className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium px-4 text-center truncate w-full">{file.name}</span>
                      <span className="text-xs text-emerald-600/80 mt-1">Ganti file</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <UploadCloud className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Klik untuk memilih file</span>
                      <span className="text-xs text-slate-500 mt-1">Maks. 5MB (JPG, PNG, PDF)</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-lg transition-all"
              disabled={!file || uploading}
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengunggah...
                </div>
              ) : (
                "Kirim Bukti Pembayaran"
              )}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
