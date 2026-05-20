"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

export default function CheckStatusPage() {
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (code.length !== 6) {
      toast.error("Kode harus 6 karakter");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("tracking_code", code.toUpperCase())
      .single();

    if (error || !data) {
      toast.error("Kode tidak ditemukan atau servis sudah selesai.");
      setResult(null);
    } else {
      setResult(data);
    }
    setLoading(false);
  };

  const getPhases = (serviceType: string) => {
    const isCheckup =
      serviceType?.toLowerCase().includes("pengecekan") ||
      serviceType?.toLowerCase().includes("checkup");
    return isCheckup
      ? ["Pengecekan awal", "Pengecekan selesai"]
      : ["Melepas komponen lama (Menunggu Sparepart)", "Memasang komponen baru", "Pengecekan terakhir"];
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-6 flex flex-col items-center">
      <Link href="/" className="mb-8 hover:opacity-80 transition-opacity">
        <div className="relative w-[200px] sm:w-[250px] aspect-[4/1]">
          <Image src="/scorpionlogo.png" alt="Scorpion Autoworks" fill className="object-contain" priority />
        </div>
      </Link>
      
      <div className="w-full max-w-md space-y-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <h1 className="text-xl font-bold text-center text-emerald-500">Lacak Progres Servis</h1>
            <p className="text-center text-slate-400 text-sm">Masukkan kode 6 karakter yang dikirim melalui email Anda.</p>
            <div className="flex gap-2">
              <Input 
                placeholder="Contoh: A1B2C3" 
                value={code} 
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="bg-slate-800 border-slate-700 uppercase tracking-widest text-center text-lg font-bold"
                maxLength={6}
              />
              <Button onClick={handleSearch} disabled={loading || code.length !== 6} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 shrink-0">
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : "Cari"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (() => {
          const phases = getPhases(result.service_type);
          const currentPhaseIdx = result.current_phase || 0;

          return (
            <Card className="bg-slate-900 border-emerald-900/50 animate-in fade-in zoom-in duration-300">
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-100">{result.customer_name}</h3>
                    <p className="text-sm text-slate-400">{result.vehicle_info} ({result.vehicle_year || '-'})</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white animate-pulse">Ongoing</Badge>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">Jenis Layanan:</p>
                  <p className="text-yellow-500 font-semibold text-sm mb-3">{result.service_type}</p>
                  <p className="text-xs text-slate-400 mb-1">Fase Saat Ini:</p>
                  <p className="text-emerald-400 font-bold text-lg">
                    {phases[currentPhaseIdx]}
                  </p>
                </div>

                {/* Progress Steps */}
                <div className="space-y-2">
                  {phases.map((phase, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        idx < currentPhaseIdx ? 'bg-emerald-600 text-white' :
                        idx === currentPhaseIdx ? 'bg-emerald-500 text-white ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {idx < currentPhaseIdx ? '✓' : idx + 1}
                      </div>
                      <span className={`text-sm ${
                        idx === currentPhaseIdx ? 'text-emerald-400 font-semibold' :
                        idx < currentPhaseIdx ? 'text-slate-400 line-through' :
                        'text-slate-500'
                      }`}>
                        {phase}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <p className="text-xs text-slate-500">Update Terakhir: {result.updated_at ? new Date(result.updated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : result.booking_date ? new Date(result.booking_date).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'}</p>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      <div className="mt-12 text-center">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
          ← Kembali ke halaman utama
        </Link>
      </div>
    </main>
  );
}
