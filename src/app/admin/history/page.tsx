"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ReceiptText, CalendarCheck, ChevronLeft, ChevronRight, Search, Printer } from "lucide-react";
import { formatWIB, formatWIBShort } from "@/utils/formatWIB";

const ITEMS_PER_PAGE = 6;

export default function HistoryPage() {
  const supabase = createClient();
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // State untuk Pop-up Invoice
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (error) throw error;
      if (data) setHistoryData(data);
      setCurrentPage(1);
    } catch (error: any) {
      toast.error("Gagal mengambil data riwayat: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openInvoice = (booking: any) => {
    setSelectedBooking(booking);
    setShowInvoiceModal(true);
  };

  const closeInvoice = () => {
    setShowInvoiceModal(false);
    setTimeout(() => setSelectedBooking(null), 300);
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-100">Riwayat Servis</h1>
        <Button variant="outline" onClick={fetchHistory} className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
          Refresh Data
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          placeholder="Cari nama, kendaraan, jenis servis, keluhan..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 animate-pulse">Memuat data riwayat...</div>
      ) : historyData.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="text-center py-20 text-slate-500">
            Belum ada riwayat servis yang diselesaikan.
          </CardContent>
        </Card>
      ) : (() => {
        // Filter data berdasarkan search query
        const query = searchQuery.toLowerCase().trim();
        const filteredData = query
          ? historyData.filter((res) =>
              (res.customer_name || "").toLowerCase().includes(query) ||
              (res.vehicle_info || "").toLowerCase().includes(query) ||
              (res.service_type || "").toLowerCase().includes(query) ||
              (res.problem_description || "").toLowerCase().includes(query) ||
              (res.customer_email || "").toLowerCase().includes(query) ||
              String(res.id).includes(query) ||
              formatWIBShort(res.completed_at).includes(query)
            )
          : historyData;

        const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedData.map((res) => (
                <Card key={res.id} className="bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all shadow-lg flex flex-col justify-between">
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex justify-between w-full items-start">
                      <Badge className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-0">
                        Selesai
                      </Badge>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <CalendarCheck className="w-3 h-3" />
                        {formatWIBShort(res.completed_at)}
                      </div>
                    </div>
                    
                    <div className="mt-1">
                      <h3 className="text-lg font-bold text-slate-200">{res.customer_name}</h3>
                      <p className="text-emerald-500 text-xs mb-2 font-medium">{res.service_type}</p>
                      <div className="bg-slate-950 p-3 rounded-md border border-slate-800">
                        <p className="text-slate-400 text-sm mb-1"><strong>Kendaraan:</strong> {res.vehicle_info}</p>
                        <p className="text-slate-400 text-sm line-clamp-2"><strong>Keluhan:</strong> {res.problem_description}</p>
                      </div>
                    </div>

                    {/* Tombol Lihat Invoice muncul jika ada data invoice */}
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      {res.invoice_data ? (
                        <Button 
                          onClick={() => openInvoice(res)} 
                          className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center gap-2"
                        >
                          <ReceiptText className="w-4 h-4" />
                          Lihat Invoice
                        </Button>
                      ) : (
                        <div className="text-center text-xs text-slate-500 py-2 bg-slate-950 rounded border border-slate-800 border-dashed">
                          Tidak ada data invoice
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={page === currentPage
                      ? "bg-yellow-500 border-yellow-500 text-slate-900 hover:bg-yellow-400 font-bold"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <span className="text-xs text-slate-500 ml-2">
                  {filteredData.length} data{query && ` (dari ${historyData.length})`}
                </span>
              </div>
            )}
          </>
        );
      })()}

      {/* ================= MODAL BACA INVOICE ===========[[[[]]]]====== */}
      <Dialog open={showInvoiceModal} onOpenChange={(open) => { if(!open) closeInvoice(); }}>
        <DialogContent className="bg-slate-900 border-slate-700 w-full !max-w-[95vw] md:!max-w-4xl lg:!max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 print:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <img src="/scorpionlogo.png" alt="Scorpion Autoworks Logo" className="h-12 w-auto object-contain" />
              </div>
              <span className="text-2xl font-bold text-white text-right">Invoice</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && selectedBooking.invoice_data && (
            <div className="py-2 space-y-6 print:py-0">
              {/* Info Pelanggan di Invoice */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm text-slate-300 print:bg-transparent print:border-none print:p-0 print:text-black">
                <div>
                  <p className="mb-1"><strong>Nama Pelanggan:</strong> {selectedBooking.customer_name}</p>
                  <p className="mb-1 text-slate-400"><strong>Email:</strong> {selectedBooking.customer_email || '-'}</p>
                  <p className="mb-1 text-slate-400"><strong>Telepon:</strong> {selectedBooking.customer_phone || '-'}</p>
                  <p className="mb-1"><strong>Kendaraan:</strong> {selectedBooking.vehicle_info}</p>
                  <p><strong>Jenis Servis:</strong> <span className="text-emerald-400">{selectedBooking.service_type}</span></p>
                </div>
                <div className="sm:text-right">
                  <p className="mb-1"><strong>Tanggal Selesai:</strong></p>
                  <p className="text-slate-400">{formatWIB(selectedBooking.completed_at)}</p>
                </div>
              </div>

              {/* Tabel Item Invoice */}
              <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950">
                <table className="w-full text-sm text-left text-slate-300 min-w-[600px]">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-800 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-center whitespace-nowrap">No.</th>
                      <th className="px-4 py-3 whitespace-nowrap">Nama</th>
                      <th className="px-4 py-3 whitespace-nowrap">Jenis</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Jumlah</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Harga Satuan</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBooking.invoice_data.items?.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-slate-500">Tidak ada item dalam invoice ini</td></tr>
                    ) : (
                      selectedBooking.invoice_data.items?.map((item: any, index: number) => (
                        <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="px-4 py-3 text-center whitespace-nowrap">{index + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-200">{item.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="outline" className="text-slate-400 border-slate-600 bg-slate-900">
                              {item.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">{item.qty}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">Rp {item.price.toLocaleString("id-ID")}</td>
                          <td className="px-4 py-3 text-right text-slate-200 font-medium whitespace-nowrap">
                            Rp {(item.price * item.qty).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Keseluruhan */}
              <div className="flex justify-end items-center mt-4">
                <div className="bg-slate-800 px-4 sm:px-6 py-3 rounded-lg border border-slate-700 flex gap-2 sm:gap-4 items-center flex-wrap sm:flex-nowrap justify-end">
                  <span className="text-slate-400 font-medium whitespace-nowrap">Total Keseluruhan:</span>
                  <span className="text-xl sm:text-2xl text-emerald-400 font-bold whitespace-nowrap">
                    Rp {selectedBooking.invoice_data.total?.toLocaleString("id-ID") || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-800 pt-4 mt-2">
            <Button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 mr-auto flex gap-2">
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button onClick={closeInvoice} className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= PRINT ONLY INVOICE ================= */}
      {showInvoiceModal && selectedBooking && (
        <div id="print-invoice-container" className="hidden print:block absolute top-0 left-0 w-full text-slate-300 z-[999999] bg-slate-900 min-h-screen">
          <style>{`
            @media print {
              @page { margin: 0; size: auto; }
              body, html { 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
                overflow: visible !important;
                height: auto !important;
                background-color: #0f172a !important;
              }
              body * { visibility: hidden !important; }
              #print-invoice-container, #print-invoice-container * { visibility: visible !important; }
              #print-invoice-container {
                position: absolute !important; left: 0 !important; top: 0 !important;
                width: 100% !important; display: block !important;
                margin: 0 !important; padding: 1.5cm !important;
                background-color: #0f172a !important; /* bg-slate-900 */
              }
            }
          `}</style>
          
          <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <img src="/scorpionlogo.png" alt="Scorpion Autoworks Logo" className="h-16 w-auto object-contain" />
              </div>
              <span className="text-3xl font-bold text-white text-right">Invoice</span>
            </div>

            <div className="flex justify-between items-start gap-3 bg-slate-950 p-6 rounded-lg border border-slate-800 text-sm">
              <div>
                <p className="mb-1"><strong>Nama Pelanggan:</strong> {selectedBooking.customer_name}</p>
                <p className="mb-1 text-slate-400"><strong>Email:</strong> {selectedBooking.customer_email || '-'}</p>
                <p className="mb-1"><strong>Kendaraan:</strong> {selectedBooking.vehicle_info}</p>
                <p className="mb-1"><strong>Tipe Servis:</strong> <span className="text-emerald-400">{selectedBooking.service_type}</span></p>
              </div>
              <div className="text-right">
                <p className="mb-1"><strong>Diselesaikan Pada:</strong> {new Date(selectedBooking.completed_at || new Date()).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-950 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-center w-16">No.</th>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3 w-32">Jenis</th>
                    <th className="px-4 py-3 text-center w-24">Jumlah</th>
                    <th className="px-4 py-3 text-right w-40">Harga Satuan</th>
                    <th className="px-4 py-3 text-right w-40">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedBooking.invoice_data?.items || selectedBooking.invoice_data.items.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-slate-500">Tidak ada item dalam invoice ini</td></tr>
                  ) : (
                    selectedBooking.invoice_data.items.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-slate-800">
                        <td className="px-4 py-3 text-center">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{item.name}</td>
                        <td className="px-4 py-3"><Badge className="bg-slate-700 text-slate-300">{item.type}</Badge></td>
                        <td className="px-4 py-3 text-center">{item.qty}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">Rp {item.price.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-3 text-right text-slate-200 font-medium whitespace-nowrap">
                          Rp {(item.price * item.qty).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end items-center mt-4">
              <div className="bg-slate-800 px-6 py-4 rounded-lg border border-slate-700 flex gap-4 items-center justify-end">
                <span className="text-slate-400 font-medium">Total Keseluruhan:</span>
                <span className="text-2xl text-emerald-400 font-bold">
                  Rp {selectedBooking.invoice_data?.total?.toLocaleString("id-ID") || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}