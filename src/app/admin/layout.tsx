"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AdminAuthGuard, { adminLogout } from "@/components/AdminAuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = () => {
    adminLogout();
    router.replace("/admin-login");
  };

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-200">
        {/* Header Admin */}
        <header className="bg-slate-900 shadow-md border-b border-slate-800 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-10">
          <div className="text-2xl font-bold text-yellow-500 tracking-tight flex items-center gap-2">
            <div className="relative h-8 sm:h-9 w-[140px] sm:w-[200px]">
              <Image src="/scorpionlogo.png" alt="Scorpion Autoworks" fill className="object-contain object-left" />
            </div>
            <span className="text-sm text-slate-500 font-normal hidden md:inline">| Panel Admin</span>
          </div>
          
          {/* Dashboard Admin */}
          <nav className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm md:text-base">
            <Link href="/admin" className="text-slate-300 hover:text-yellow-500 font-medium transition-colors">
              Dashboard
            </Link>
            <Link href="/admin/ongoing" className="text-slate-300 hover:text-yellow-500 font-medium transition-colors">
              Ongoing
            </Link>
            <Link href="/admin/scheduled" className="text-slate-300 hover:text-yellow-500 font-medium transition-colors">
              Scheduled
            </Link>
            <Link href="/admin/sparepart" className="text-slate-300 hover:text-yellow-500 font-medium transition-colors">
              Sparepart
            </Link>
            <Link href="/admin/history" className="text-slate-300 hover:text-yellow-500 font-medium transition-colors">
              Riwayat
            </Link>
            <button
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 font-medium transition-colors sm:ml-2 md:ml-4 sm:border-l border-slate-700 sm:pl-4 md:pl-6 cursor-pointer"
            >
              Logout
            </button>
          </nav>
        </header>

        {/* Konten Halaman Admin */}
        <main className="p-4 sm:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </AdminAuthGuard>
  );
}