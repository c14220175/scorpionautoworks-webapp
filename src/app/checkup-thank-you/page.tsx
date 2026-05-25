"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const choice = searchParams.get("choice");
  const already = searchParams.get("already");
  const type = searchParams.get("type"); // 'estimation' or null
  const rejected = searchParams.get("rejected");

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

      <div className="max-w-md w-full text-center space-y-6">
        {already ? (
          <>
            <div className="text-5xl mb-4">📋</div>
            <h1 className="text-2xl font-bold text-yellow-500">
              Respon Sudah Tercatat
            </h1>
            <p className="text-slate-400">
              Anda sudah pernah memberikan respon sebelumnya. Jika ada perubahan,
              silakan hubungi kami langsung.
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-emerald-500">
              Terima Kasih!
            </h1>
            <p className="text-slate-400">
              Respon Anda telah berhasil dicatat.
              
              {type === "estimation" ? (
                rejected === "true" ? (
                  <span className="block mt-2 text-rose-400 font-semibold">
                    Penolakan penawaran harga telah kami terima. Tim kami akan segera menindaklanjuti.
                  </span>
                ) : choice === "yes" ? (
                  <span className="block mt-2 text-emerald-400 font-semibold">
                    Penawaran harga disetujui. Tim kami akan segera melanjutkan pengerjaan kendaraan Anda.
                  </span>
                ) : null
              ) : (
                choice === "yes" ? (
                  <span className="block mt-2 text-emerald-400 font-semibold">
                    Tim kami akan segera memproses perbaikan kendaraan Anda.
                  </span>
                ) : (
                  <span className="block mt-2 text-blue-400 font-semibold">
                    Kendaraan Anda akan segera disiapkan untuk pengambilan.
                  </span>
                )
              )}
            </p>
          </>
        )}

        <div className="pt-4">
          <Link
            href="/"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Kembali ke Halaman Utama
          </Link>
        </div>
      </div>

      <p className="mt-12 text-xs text-slate-600">
        © {new Date().getFullYear()} Scorpion Autoworks. All rights reserved.
      </p>
    </main>
  );
}

export default function CheckupThankYouPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 flex items-center justify-center">
          <p className="text-slate-500 animate-pulse">Memuat...</p>
        </main>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
