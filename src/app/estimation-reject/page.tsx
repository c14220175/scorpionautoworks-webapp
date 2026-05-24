"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function RejectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!reason.trim()) {
      toast.error("Mohon isi alasan penolakan.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          estimation_status: "rejected",
          estimation_reject_reason: reason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      router.push("/checkup-thank-you?type=estimation&rejected=true");
    } catch (err: any) {
      toast.error("Gagal mengirim alasan: " + err.message);
      setLoading(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-500 mb-4">ID Booking tidak ditemukan.</p>
        <Link href="/" className="text-emerald-500 hover:underline">
          Kembali ke Halaman Utama
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6">
      <Link href="/" className="mb-8 hover:opacity-80 transition-opacity">
        <div className="relative w-[200px] sm:w-[250px] aspect-[4/1]">
          <Image
            src="/scorpionlogo.png"
            alt="Scorpion Autoworks"
            fill
            className="object-contain"
            priority
          />
        </div>
      </Link>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-rose-500 mb-2">
            Tolak Estimasi Biaya
          </h1>
          <p className="text-slate-400 text-sm">
            Mohon beritahu kami alasan Anda menolak estimasi biaya ini, agar kami dapat memberikan solusi terbaik.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400">
              Alasan Penolakan <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Harganya terlalu mahal, atau saya memutuskan untuk menunda perbaikan dulu..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !reason.trim()}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 h-auto"
          >
            {loading ? "Mengirim..." : "Kirim Alasan Penolakan"}
          </Button>
        </form>
      </div>
      
      <p className="mt-12 text-xs text-slate-600">
        © {new Date().getFullYear()} Scorpion Autoworks. All rights reserved.
      </p>
    </main>
  );
}

export default function EstimationRejectPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 flex items-center justify-center">
          <p className="text-slate-500 animate-pulse">Memuat...</p>
        </main>
      }
    >
      <RejectContent />
    </Suspense>
  );
}
