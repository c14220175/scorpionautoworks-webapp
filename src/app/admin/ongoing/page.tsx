"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction 
} from "@/components/ui/alert-dialog";
import { Search, Trash2, Printer, X } from "lucide-react";

export default function OngoingPage() {
  const supabase = createClient();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // State Dialog Utama
  const [selectedRes, setSelectedRes] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);

  // State Pop-up Beruntun
  const [showKendalaPopup, setShowKendalaPopup] = useState(false);
  const [showKendalaFormPopup, setShowKendalaFormPopup] = useState(false);
  const [showKirimEmailPopup, setShowKirimEmailPopup] = useState(false);
  const [showEscalatePopup, setShowEscalatePopup] = useState(false);
  const [showSetujuEscalatePopup, setShowSetujuEscalatePopup] = useState(false);

  // Form State
  const [kendalaType, setKendalaType] = useState<"Reparasi" | "Servis" | "">("");
  const [kendalaDesc, setKendalaDesc] = useState("");
  const [kendalaImageFile, setKendalaImageFile] = useState<File | null>(null);
  const [checkupEmailLoading, setCheckupEmailLoading] = useState(false);
  const [hasEscalateButton, setHasEscalateButton] = useState(false);
  const [escalateChoice, setEscalateChoice] = useState<"Reparasi" | "Servis" | "">("");

  // ================= INVOICE STATES =================
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  
  // Tambah Part Modal
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  
  // Part Customer Modal
  const [showPartCustModal, setShowPartCustModal] = useState(false);
  const [partCustName, setPartCustName] = useState("");

  // Part Inden (DP 50%) Modal
  const [showPartIndenModal, setShowPartIndenModal] = useState(false);
  const [indenName, setIndenName] = useState("");
  const [indenItemType, setIndenItemType] = useState("");
  const [indenPriceTotal, setIndenPriceTotal] = useState<number | "">("")
  const [partCustItemType, setPartCustItemType] = useState("");
  
  // Part Inventory Modal
  const [showPartInvModal, setShowPartInvModal] = useState(false);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [invSearch, setInvSearch] = useState("");
  const [selectedInvItem, setSelectedInvItem] = useState<any | null>(null);
  const [showInvQtyModal, setShowInvQtyModal] = useState(false);
  const [invQty, setInvQty] = useState<number | "">("");
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Tambah Jasa Modal
  const [showAddJasaModal, setShowAddJasaModal] = useState(false);
  const [jasaName, setJasaName] = useState("");
  const [jasaPrice, setJasaPrice] = useState<number | "">("");

  // Jasa Kompleksitas Modal
  const [showKompleksitasModal, setShowKompleksitasModal] = useState(false);
  const [kompleksitasPrice, setKompleksitasPrice] = useState<number | "">(0);
  const [pendingInvoiceItems, setPendingInvoiceItems] = useState<any[]>([]);
  const [pendingJasaItem, setPendingJasaItem] = useState<any | null>(null);
  
  // ================= ESTIMATION STATES =================
  const [estimationStatus, setEstimationStatus] = useState<string | null>(null);
  const [estimationRejectReason, setEstimationRejectReason] = useState<string | null>(null);
  const [estimationEmailLoading, setEstimationEmailLoading] = useState(false);
  
  // Modal Form Estimasi
  const [showEstimasiFormModal, setShowEstimasiFormModal] = useState(false);
  const [estimasiPart, setEstimasiPart] = useState<number | "">("");
  const [estimasiJasa, setEstimasiJasa] = useState<number | "">("");
  const [estimasiNotes, setEstimasiNotes] = useState("");

  // ================= DP VERIFICATION STATES =================
  const [showDpVerificationModal, setShowDpVerificationModal] = useState(false);
  const [dpVerificationRes, setDpVerificationRes] = useState<any | null>(null);
  const [dpActionLoading, setDpActionLoading] = useState(false);
  const [isSendingDpEmail, setIsSendingDpEmail] = useState(false);
  // ===================================================

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("status", "in_progress")
        .order("booking_date", { ascending: false });

      if (error) throw error;
      if (data) setReservations(data);
    } catch (error: any) {
      toast.error("Gagal mengambil data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isCheckup =
    selectedRes?.service_type?.toLowerCase().includes("pengecekan") ||
    selectedRes?.service_type?.toLowerCase().includes("checkup");

  const phases = isCheckup
    ? ["Pengecekan awal", "Pengecekan selesai"]
    : ["Melepas komponen lama (Menunggu Sparepart)", "Memasang komponen baru", "Pengecekan terakhir"];

  const isLastPhase = currentPhaseIndex === phases.length - 1;

  // Cek apakah fase saat ini adalah "Memasang komponen baru"
  const isMelepasPhase = !isCheckup && currentPhaseIndex === 0;
  const isMerasangPhase = !isCheckup && currentPhaseIndex === 1;
  const showInvoiceItemsReadOnly = !isCheckup && currentPhaseIndex > 1 && invoiceItems.length > 0;

  const handleOpenDetail = (res: any) => {
    setSelectedRes(res);
    setCurrentPhaseIndex(res.current_phase || 0);
    setHasEscalateButton(false);
    setKendalaType("");
    setKendalaDesc("");
    setKendalaImageFile(null);
    setEscalateChoice("");

    // Load estimation or invoice data depending on phase
    const isCheckup = res.service_type?.toLowerCase().includes("pengecekan") || res.service_type?.toLowerCase().includes("checkup");
    const phase = res.current_phase || 0;
    
    if (!isCheckup && phase === 0) {
      if (res.estimation_data && res.estimation_data.items) {
        setInvoiceItems(res.estimation_data.items);
      } else {
        setInvoiceItems([]);
      }
    } else {
      if (res.invoice_data && res.invoice_data.items) {
        setInvoiceItems(res.invoice_data.items);
      } else {
        setInvoiceItems([]);
      }
    }

    setEstimationStatus(res.estimation_status || null);
    setEstimationRejectReason(res.estimation_reject_reason || null);

    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => setSelectedRes(null), 300);
  };

  const handleLanjutProgress = async () => {
    if (!isLastPhase) {
      const nextPhase = currentPhaseIndex + 1;

      // Untuk General Checkup: tampilkan popup kendala DULU sebelum menyimpan fase ke database
      if (isCheckup && nextPhase === 1) {
        setShowKendalaPopup(true);
        return; // Jangan advance fase dulu — tunggu jawaban kendala
      }

      // Untuk servis non-checkup: langsung advance fase seperti biasa
      setCurrentPhaseIndex(nextPhase);

      // Simpan fase ke database agar tidak reset saat dialog ditutup
      try {
        const updateData: any = { current_phase: nextPhase, updated_at: new Date().toISOString() };
        
        // Do not copy estimation data anymore to invoice data
        // because invoice will be generated based on real items in the next phase
        if (!isCheckup && currentPhaseIndex === 0) {
          // just let invoice_data be empty for real item entries later
        }

        
        await supabase.from("bookings").update(updateData).eq("id", selectedRes.id);
        
        // Update local state agar tidak reset saat dialog ditutup/dibuka ulang
        const updatedRes = { ...selectedRes, current_phase: nextPhase };
        // Do not assign estimation data to invoice_data locally either

        setSelectedRes(updatedRes);
        setReservations(prev => prev.map(r => r.id === selectedRes.id ? { ...r, current_phase: nextPhase } : r));

        // Send email notification for phase change
        if (selectedRes.customer_email) {
          const phaseText = phases[nextPhase];
          fetch('/api/send-service-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerName: selectedRes.customer_name,
              customerEmail: selectedRes.customer_email,
              vehicleInfo: selectedRes.vehicle_info,
              vehicleYear: selectedRes.vehicle_year || '-',
              serviceType: selectedRes.service_type,
              currentPhase: phaseText,
              isCompleted: false,
            }),
          }).catch(err => console.error("Gagal mengirim email notifikasi fase:", err));
        }
      } catch (err: any) {
        console.error("Gagal menyimpan fase:", err.message);
      }
    }
  };

  // Helper: advance checkup phase to "Pengecekan selesai" after kendala answer
  const advanceCheckupPhase = async () => {
    const nextPhase = 1; // "Pengecekan selesai"
    setCurrentPhaseIndex(nextPhase);
    try {
      await supabase.from("bookings").update({ current_phase: nextPhase, updated_at: new Date().toISOString() }).eq("id", selectedRes.id);
    } catch (err: any) {
      console.error("Gagal menyimpan fase checkup:", err.message);
    }
  };

  const handleEscalateConfirm = async () => {
    setActionLoading(true);
    try {
      const newServiceType = escalateChoice === "Reparasi" ? "Repair / Perbaikan Komponen" : "Servis Rutin";
      const { error } = await supabase.from("bookings").update({ service_type: newServiceType, current_phase: 0, updated_at: new Date().toISOString() }).eq("id", selectedRes.id);
      if (error) throw error;

      setSelectedRes({ ...selectedRes, service_type: newServiceType });
      setCurrentPhaseIndex(0);
      setHasEscalateButton(false);
      setShowSetujuEscalatePopup(false);
      fetchBookings();
      toast.success("Eskalasi berhasil. Jenis servis telah diperbarui.");
    } catch (error: any) {
      toast.error("Gagal mengupdate jenis servis: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelService = async () => {
    if (!selectedRes) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", selectedRes.id);

      if (error) throw error;

      // Send cancellation email
      if (selectedRes.customer_email) {
        await fetch('/api/send-service-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: selectedRes.customer_name,
            customerEmail: selectedRes.customer_email,
            vehicleInfo: selectedRes.vehicle_info,
            vehicleYear: selectedRes.vehicle_year || '-',
            serviceType: selectedRes.service_type,
            currentPhase: phases[currentPhaseIndex] || "-",
            isCancelled: true,
          }),
        });
      }

      toast.success("Layanan berhasil dibatalkan dan email pembatalan telah dikirim.");
      setIsDetailOpen(false);
      setSelectedRes(null);
      fetchBookings();
    } catch (error: any) {
      toast.error("Gagal membatalkan layanan: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const submitEstimasiForm = async () => {
    if (!selectedRes) return;
    if (!estimasiPart && !estimasiJasa) {
      toast.error("Mohon isi setidaknya estimasi part atau jasa.");
      return;
    }

    setEstimationEmailLoading(true);
    try {
      const pPrice = Number(estimasiPart) || 0;
      const sPrice = Number(estimasiJasa) || 0;
      const total = pPrice + sPrice;
      const items = [];

      if (pPrice > 0) items.push({ id: Date.now(), name: "Estimasi Biaya Parts", type: "Part-Estimasi", qty: 1, price: pPrice });
      if (sPrice > 0) items.push({ id: Date.now() + 1, name: "Estimasi Biaya Jasa", type: "Jasa-Estimasi", qty: 1, price: sPrice });

      // Save estimation to DB
      const { error: dbError } = await supabase
        .from("bookings")
        .update({ 
          estimation_data: { items, total },
          estimation_status: "pending"
        })
        .eq("id", selectedRes.id);

      if (dbError) throw dbError;

      // Send Email
      const emailRes = await fetch('/api/send-estimation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: selectedRes.customer_name,
          customerEmail: selectedRes.customer_email,
          vehicleInfo: selectedRes.vehicle_info,
          vehicleYear: selectedRes.vehicle_year || '-',
          serviceType: selectedRes.service_type,
          estimationItems: items,
          estimationTotal: total,
          estimationNotes: estimasiNotes,
          bookingId: selectedRes.id,
          trackingCode: selectedRes.tracking_code,
        }),
      });

      if (!emailRes.ok) throw new Error("Gagal mengirim email estimasi");

      toast.success("Estimasi berhasil dikirim ke pelanggan!");
      setEstimationStatus("pending");
      setInvoiceItems(items);
      setShowEstimasiFormModal(false);
      
      // Update local state
      setSelectedRes({
        ...selectedRes,
        estimation_status: "pending",
        estimation_data: { items, total }
      });
      fetchBookings();
    } catch (err: any) {
      toast.error("Terjadi kesalahan: " + err.message);
    } finally {
      setEstimationEmailLoading(false);
    }
  };


  // ================= INVOICE FUNCTIONS =================

  // Helper: harga jasa bongkar/pasang berdasarkan jenis item
  const getJasaBongkarPasangPrice = (itemType: string): number => {
    switch (itemType) {
      case "Understeel (Suspension)": return 200000;
      case "Engine Component": return 150000;
      case "Understeel (Brakes)": return 350000;
      default: return 0;
    }
  };

  // Simpan invoice items ke database secara incremental
  const saveInvoiceToDb = async (items: any[]) => {
    if (!selectedRes) return;
    const total = items.reduce((acc: number, curr: any) => acc + (curr.price * curr.qty), 0);
    try {
      if (!isCheckup && currentPhaseIndex === 0) {
        // Save as estimation
        const { error } = await supabase
          .from("bookings")
          .update({ estimation_data: { items, total } })
          .eq("id", selectedRes.id);
        if (error) console.error("Gagal menyimpan estimasi ke DB:", error.message);
      } else {
        // Save as invoice
        const { error } = await supabase
          .from("bookings")
          .update({ invoice_data: { items, total } })
          .eq("id", selectedRes.id);
        if (error) console.error("Gagal menyimpan invoice ke DB:", error.message);
      }
    } catch (err: any) {
      console.error("Gagal menyimpan:", err.message);
    }
  };

  // Buka invoice read-only (tanpa reset items)
  const openInvoice = () => {
    setIsDetailOpen(false);
    setShowInvoiceModal(true);
  };

  const submitPartCustomer = () => {
    if (!partCustName.trim()) { toast.error("Nama part tidak boleh kosong"); return; }
    if (!partCustItemType) { toast.error("Pilih jenis item terlebih dahulu"); return; }
    const newItem = {
      id: Date.now(),
      name: partCustName,
      item_type: partCustItemType,
      type: "Part-Customer",
      qty: 1,
      price: 0
    };
    const itemsWithPart = [...invoiceItems, newItem];

    // Auto-add jasa bongkar/pasang berdasarkan jenis item
    const jasaPrice = getJasaBongkarPasangPrice(partCustItemType);
    if (jasaPrice > 0) {
      const jasaItem = {
        id: Date.now() + 1,
        name: `Jasa Bongkar/Pasang (${partCustItemType})`,
        type: "Jasa",
        qty: 1,
        price: jasaPrice
      };
      // Tampilkan modal kompleksitas sebelum menambahkan
      setPendingInvoiceItems(itemsWithPart);
      setPendingJasaItem(jasaItem);
      setKompleksitasPrice(0);
      setShowPartCustModal(false);
      setShowKompleksitasModal(true);
    } else {
      // "Lainnya" atau tipe tanpa jasa — langsung simpan tanpa jasa bongkar/pasang
      setInvoiceItems(itemsWithPart);
      saveInvoiceToDb(itemsWithPart);
    }

    setPartCustName("");
    setPartCustItemType("");
    if (jasaPrice <= 0) setShowPartCustModal(false);
  };

  // Fetch inventory dari database
  const fetchInventory = async () => {
    setShowAddPartModal(false);
    setShowPartInvModal(true); 
    setLoadingInventory(true); 
    
    try {
      const { data, error } = await supabase.from("inventory").select("*").gt("stock_count", 0);
      if (error) throw error;
      setInventoryList(data || []);
    } catch (err: any) {
      console.error("Supabase Error:", err.message || JSON.stringify(err));
      toast.error(`Gagal memuat data: ${err.message || 'Tabel inventory tidak ditemukan'}`);
      setInventoryList([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  const submitPartInventoryQty = async () => {
    if (!invQty || invQty <= 0) { toast.error("Jumlah tidak valid"); return; }
    if (invQty > selectedInvItem.stock_count) {
      toast.error(`Barang pilihan sudah maks stok! (Maks: ${selectedInvItem.stock_count})`);
      return;
    }

    // Langsung kurangi stok di database saat part ditambahkan ke invoice
    const qtyNum = Number(invQty);
    try {
      const newStock = selectedInvItem.stock_count - qtyNum;
      if (newStock <= 0) {
        // Stok habis, hapus dari inventory
        const { error } = await supabase.from("inventory").delete().eq("id", selectedInvItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory").update({ stock_count: newStock }).eq("id", selectedInvItem.id);
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error("Gagal mengurangi stok: " + err.message);
      return;
    }

    const newItem = {
      id: Date.now(),
      inv_id: selectedInvItem.id, 
      name: selectedInvItem.name,
      type: "Part-Inventory",
      qty: qtyNum,
      price: selectedInvItem.price,
      item_type: selectedInvItem.item_type || null,
      category: selectedInvItem.category || null,
      vendor: selectedInvItem.vendor || null
    };
    const itemsWithPart = [...invoiceItems, newItem];

    // Auto-add jasa bongkar/pasang berdasarkan jenis item dari inventory
    const itemType = selectedInvItem.item_type || "";
    const jasaPrice = getJasaBongkarPasangPrice(itemType);
    if (jasaPrice > 0) {
      const jasaItem = {
        id: Date.now() + 1,
        name: `Jasa Bongkar/Pasang (${itemType})`,
        type: "Jasa",
        qty: 1,
        price: jasaPrice
      };
      // Tampilkan modal kompleksitas
      setPendingInvoiceItems(itemsWithPart);
      setPendingJasaItem(jasaItem);
      setKompleksitasPrice(0);
      setShowInvQtyModal(false);
      setShowKompleksitasModal(true);
    } else {
      // Tipe tanpa jasa (Lainnya dll) — langsung simpan
      setInvoiceItems(itemsWithPart);
      saveInvoiceToDb(itemsWithPart);
      setShowInvQtyModal(false);
    }

    setInvQty("");
    setSelectedInvItem(null);
  };

  const submitJasa = () => {
    if (!jasaName.trim() || !jasaPrice || jasaPrice < 0) {
      toast.error("Nama jasa dan harga harus diisi dengan benar"); return;
    }
    const newItem = {
      id: Date.now(),
      name: jasaName,
      type: "Jasa",
      qty: 1,
      price: Number(jasaPrice)
    };
    const newItems = [...invoiceItems, newItem];
    setInvoiceItems(newItems);
    saveInvoiceToDb(newItems);
    setJasaName("");
    setJasaPrice("");
    setShowAddJasaModal(false);
  };

  // Submit Part Inden (DP 50%)
  const submitPartInden = () => {
    if (!indenName.trim()) { toast.error("Nama part tidak boleh kosong"); return; }
    if (!indenItemType) { toast.error("Pilih jenis item terlebih dahulu"); return; }
    if (!indenPriceTotal || indenPriceTotal <= 0) { toast.error("Estimasi harga total harus lebih dari 0"); return; }

    const fullPrice = Number(indenPriceTotal);
    const newItem = {
      id: Date.now(),
      name: `${indenName} (Part Inden)`,
      item_type: indenItemType,
      type: "Part-Inden",
      qty: 1,
      price: fullPrice,
      full_price: fullPrice
    };
    const itemsWithPart = [...invoiceItems, newItem];

    // Auto-add jasa bongkar/pasang berdasarkan jenis item
    const jasaPrice = getJasaBongkarPasangPrice(indenItemType);
    if (jasaPrice > 0) {
      const jasaItem = {
        id: Date.now() + 1,
        name: `Jasa Bongkar/Pasang (${indenItemType})`,
        type: "Jasa",
        qty: 1,
        price: jasaPrice
      };
      // Tampilkan modal kompleksitas
      setPendingInvoiceItems(itemsWithPart);
      setPendingJasaItem(jasaItem);
      setKompleksitasPrice(0);
      setShowPartIndenModal(false);
      setShowKompleksitasModal(true);
    } else {
      // Tipe tanpa jasa (Lainnya dll) — langsung simpan
      setInvoiceItems(itemsWithPart);
      saveInvoiceToDb(itemsWithPart);
      setShowPartIndenModal(false);
    }

    setIndenName("");
    setIndenItemType("");
    setIndenPriceTotal("");
  };

  // Hapus Item (+ simpan ke DB, kembalikan stok jika Part-Inventory)
  const removeItem = async (id: number) => {
    const itemToRemove = invoiceItems.find(item => item.id === id);

    // Kembalikan stok jika item yang dihapus adalah Part-Inventory
    if (itemToRemove && itemToRemove.type === "Part-Inventory" && itemToRemove.inv_id) {
      try {
        const { data: invData } = await supabase.from("inventory").select("*").eq("id", itemToRemove.inv_id).single();
        if (invData) {
          // Item masih ada di inventory, tambahkan stok kembali
          const restoredStock = invData.stock_count + itemToRemove.qty;
          await supabase.from("inventory").update({ stock_count: restoredStock }).eq("id", itemToRemove.inv_id);
        } else {
          // Item sudah dihapus dari inventory (stok habis), re-insert
          // Ambil data dari selectedInvItem cache atau dari invoice item
          await supabase.from("inventory").insert([{
            id: itemToRemove.inv_id,
            name: itemToRemove.name,
            stock_count: itemToRemove.qty,
            price: itemToRemove.price,
            item_type: itemToRemove.item_type || null,
            category: itemToRemove.category || null,
            vendor: itemToRemove.vendor || null
          }]);
        }
      } catch (err: any) {
        console.error("Gagal mengembalikan stok:", err.message);
      }
    }

    const newItems = invoiceItems.filter(item => item.id !== id);
    setInvoiceItems(newItems);
    saveInvoiceToDb(newItems);
  };

  // Final Submit Selesai Servis + Invoice
  const executeFinishInvoice = async () => {
    if (!selectedRes) return;
    setActionLoading(true);
    
    try {
      // Stok sudah dikurangi saat part ditambahkan ke invoice, jadi langsung simpan

      // Simpan invoice dan selesaikan booking
      const currentTime = new Date().toISOString();
      const totalBayar = invoiceItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

      const { error } = await supabase
        .from("bookings")
        .update({ 
          status: "completed",
          completed_at: currentTime,
          invoice_data: { items: invoiceItems, total: totalBayar },
          tracking_code: null // Set null agar kode bisa dipakai kembali
        })
        .eq("id", selectedRes.id);
        
      if (error) {
        console.error("Error saving invoice_data:", error);
        const { error: fallbackError } = await supabase
          .from("bookings")
          .update({ status: "completed", completed_at: currentTime })
          .eq("id", selectedRes.id);
          
        if (fallbackError) throw fallbackError;
        toast.warning("Servis selesai, tetapi struk invoice tidak tersimpan karena kolom belum dibuat di Database.");
      } else {
        toast.success("Servis & Invoice Selesai! Data dipindahkan ke Riwayat.");
      }
      
      // Send email notification for service completion
      if (selectedRes.customer_email) {
        try {
          await fetch('/api/send-service-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerName: selectedRes.customer_name,
              customerEmail: selectedRes.customer_email,
              vehicleInfo: selectedRes.vehicle_info,
              vehicleYear: selectedRes.vehicle_year || '-',
              serviceType: selectedRes.service_type,
              currentPhase: phases[currentPhaseIndex],
              isCompleted: true,
              invoiceItems: invoiceItems,
              totalBayar: totalBayar
            }),
          });
        } catch (emailErr) {
          console.error("Gagal mengirim email invoice:", emailErr);
        }
      }
      
      setShowInvoiceModal(false);
      setSelectedRes(null);
      fetchBookings();
    } catch (error: any) {
      toast.error("Gagal menyelesaikan servis: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter pencarian inventory
  const filteredInventory = inventoryList.filter(inv => 
    (inv.name || "").toLowerCase().includes(invSearch.toLowerCase())
  );

  // Hitung total sementara
  const runningTotal = invoiceItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

  // ================= DP VERIFICATION HANDLERS =================
  const handleVerifyDp = async () => {
    if (!dpVerificationRes) return;
    setDpActionLoading(true);
    try {
      let updatePayload: any = { dp_status: "verified", updated_at: new Date().toISOString() };
      
      // Inject DP-Deduction item into invoice or estimation
      let targetDataField = null;
      let parsedItems = [];
      
      if (dpVerificationRes.invoice_data?.items?.some((i: any) => i.type === 'Part-Inden')) {
        targetDataField = 'invoice_data';
        parsedItems = dpVerificationRes.invoice_data.items;
      } else if (dpVerificationRes.estimation_data?.items?.some((i: any) => i.type === 'Part-Inden')) {
        targetDataField = 'estimation_data';
        parsedItems = dpVerificationRes.estimation_data.items;
      }

      if (targetDataField) {
        const dpAmount = parsedItems.filter((i: any) => i.type === 'Part-Inden').reduce((sum: number, item: any) => sum + (Math.round((item.price * item.qty) / 2)), 0);
        const alreadyHasDeduction = parsedItems.some((i: any) => i.type === 'DP-Deduction');
        
        if (dpAmount > 0 && !alreadyHasDeduction) {
          const deductionItem = {
            id: Date.now(),
            name: "Pembayaran DP (-50%)",
            type: "DP-Deduction",
            qty: 1,
            price: -dpAmount,
            item_type: "Deduction"
          };
          const newItems = [...parsedItems, deductionItem];
          const newTotal = newItems.reduce((acc: number, curr: any) => acc + (curr.price * curr.qty), 0);
          
          updatePayload[targetDataField] = { items: newItems, total: newTotal };
        }
      }

      const { error } = await supabase
        .from("bookings")
        .update(updatePayload)
        .eq("id", dpVerificationRes.id);

      if (error) throw error;
      toast.success("DP berhasil diverifikasi.");
      
      if (selectedRes && selectedRes.id === dpVerificationRes.id && updatePayload[targetDataField as string]) {
         setInvoiceItems(updatePayload[targetDataField as string].items);
      }
      setShowDpVerificationModal(false);
      setDpVerificationRes(null);
      fetchBookings();
    } catch (err: any) {
      toast.error("Gagal verifikasi DP: " + err.message);
    } finally {
      setDpActionLoading(false);
    }
  };

  const handleRejectDp = async () => {
    if (!dpVerificationRes) return;
    setDpActionLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ dp_status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", dpVerificationRes.id);

      if (error) throw error;
      toast.success("DP ditolak. Pelanggan dapat mengunggah ulang.");
      setShowDpVerificationModal(false);
      setDpVerificationRes(null);
      fetchBookings();
    } catch (err: any) {
      toast.error("Gagal menolak DP: " + err.message);
    } finally {
      setDpActionLoading(false);
    }
  };

  const handleSendDpEmail = async (res: any) => {
    if (!res.customer_email) {
      toast.error("Pelanggan ini tidak memiliki alamat email yang tersimpan.");
      return;
    }
    const invoiceItems = res.invoice_data?.items || [];
    const estimationItems = res.estimation_data?.items || [];
    const parsedItems = [...invoiceItems, ...estimationItems];
    const dpAmount = parsedItems.filter((i: any) => i.type === 'Part-Inden').reduce((sum: number, item: any) => sum + (Math.round((item.price * item.qty) / 2)), 0);

    setIsSendingDpEmail(true);
    try {
      const response = await fetch('/api/send-dp-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: res.customer_name,
          customerEmail: res.customer_email,
          vehicleInfo: res.vehicle_info,
          dpAmount,
          dpLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://scorpionautoworks.my.id'}/payment/${res.id}`
        })
      });

      if (!response.ok) {
        throw new Error('Gagal mengirim email');
      }

      toast.success("Email tagihan DP berhasil dikirim ke pelanggan!");
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsSendingDpEmail(false);
    }
  };

  const awaitingDpReservations = reservations.filter(res => res.dp_status === "awaiting_verification");
  const ongoingReservations = reservations.filter(res => res.dp_status !== "awaiting_verification");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-100">Sedang Dikerjakan (Ongoing)</h1>
        <Button variant="outline" onClick={fetchBookings} className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
          Refresh Data
        </Button>
      </div>

      {awaitingDpReservations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-amber-500 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Menunggu Verifikasi DP
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {awaitingDpReservations.map((res) => (
              <Card key={res.id} className="bg-slate-900 border border-amber-900/50 transition-all shadow-lg">
                <CardContent className="p-5 flex flex-col gap-2">
                  <div className="flex justify-between w-full">
                    <Badge className="bg-amber-600 text-white animate-pulse">Menunggu Verifikasi</Badge>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-lg font-bold text-slate-200">{res.customer_name}</h3>
                    <p className="text-amber-500 text-xs mb-1 font-medium">{res.service_type}</p>
                    <p className="text-slate-400 text-sm mt-1 mb-4">{res.vehicle_info}</p>
                    <Button 
                      onClick={() => {
                        setDpVerificationRes(res);
                        setShowDpVerificationModal(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      Cek Bukti Pembayaran
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-500 animate-pulse">Memuat data...</div>
      ) : ongoingReservations.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800"><CardContent className="text-center py-20 text-slate-500">Tidak ada kendaraan yang sedang dikerjakan.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ongoingReservations.map((res) => (
            <Card key={res.id} onClick={() => handleOpenDetail(res)} className="bg-slate-900 border border-emerald-900/50 hover:border-emerald-500/50 cursor-pointer transition-all group shadow-lg">
              <CardContent className="p-5 flex flex-col gap-2">
                <div className="flex justify-between w-full">
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 animate-pulse">
                    In Progress
                  </Badge>
                </div>
                <div className="mt-2">
                  <h3 className="text-lg font-bold text-slate-200">{res.customer_name}</h3>
                  <p className="text-emerald-500 text-xs mb-1 font-medium">{res.service_type}</p>
                  <p className="text-slate-400 text-sm mt-1">{res.vehicle_info}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL UTAMA: Detail Pengerjaan */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => { if(!open) handleCloseDetail(); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-500 text-xl border-b border-slate-700 pb-3">Detail Pengerjaan</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
             <div className="text-sm text-slate-300 space-y-3">
               <p><strong>Pelanggan:</strong> {selectedRes?.customer_name}</p>
               <p className="flex items-center gap-2">
                 <strong>Telepon:</strong> 
                 {selectedRes?.customer_phone ? (
                   <a href={`tel:${selectedRes.customer_phone}`} className="text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-1.5">
                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                     {selectedRes.customer_phone}
                   </a>
                 ) : <span className="text-slate-500">-</span>}
               </p>
               <p><strong>Kendaraan:</strong> {selectedRes?.vehicle_info}</p>
               <p><strong>Jenis Layanan:</strong> {selectedRes?.service_type}</p>
               <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <p><strong>Fase Pengerjaan:</strong> <span className="text-emerald-400 font-bold ml-1">{phases[currentPhaseIndex]}</span></p>
               </div>

                {/* ====== Checkup Description (if exists) ====== */}
                {selectedRes?.checkup_description && (
                  <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-700/50 mt-2">
                    <p className="text-sm font-bold text-yellow-500 mb-1">🔍 Kendala Ditemukan:</p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedRes.checkup_description}</p>
                    {selectedRes.checkup_image_url && (
                      <img src={selectedRes.checkup_image_url} alt="Foto kendala" className="mt-2 rounded-lg max-w-full max-h-48 object-cover border border-slate-700" />
                    )}
                  </div>
                )}

                {/* ====== Customer Checkup Response ====== */}
                {selectedRes?.checkup_description && !selectedRes?.customer_checkup_response && (
                  <div className="bg-amber-900/20 p-3 rounded-lg border border-amber-700/50 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </span>
                      <p className="text-sm font-bold text-amber-400">Menunggu Respon Pelanggan...</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Email kendala telah dikirim. Menunggu pelanggan memilih apakah akan melanjutkan perbaikan atau tidak.</p>
                  </div>
                )}

                {selectedRes?.customer_checkup_response && (
                  <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-700 mt-2">
                    <p className="text-sm font-bold text-blue-400">Respon Pelanggan:</p>
                    <p className="text-lg text-white font-bold">{selectedRes.customer_checkup_response}</p>
                    <p className="text-xs text-blue-300 mt-2">
                      {selectedRes.customer_checkup_response === 'Lanjut Reparasi'
                        ? "Gunakan tombol 'Escalate' untuk mengubah layanan."
                        : "Silahkan klik 'Selesaikan Servis' untuk membuat invoice."}
                    </p>
                  </div>
                )}

               {/* ====== SECTION: Barang & Jasa (tampil saat fase "Memasang komponen baru" atau setelahnya) ====== */}
               {(isMelepasPhase || isMerasangPhase || showInvoiceItemsReadOnly) && (
                 <div className="mt-4 pt-4 border-t border-slate-800">
                   <div className="flex items-center justify-between mb-3">
                     <h4 className="text-sm font-semibold text-yellow-500 flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                       Barang & Jasa
                     </h4>
                   </div>

                   {/* Tombol tambah - hanya tampil saat fase "Memasang komponen baru" */}
                   {(isMelepasPhase || isMerasangPhase) && (
                     <div className="flex flex-col gap-2 mb-3">
                       {isMelepasPhase && (
                         <div className="mb-2">
                           {estimationStatus === "pending" && (
                             <Badge className="bg-yellow-500 text-slate-900 animate-pulse w-fit">Menunggu Persetujuan Pelanggan...</Badge>
                           )}
                           {estimationStatus === "approved" && (
                             <Badge className="bg-emerald-600 text-white w-fit">Estimasi Disetujui ✅</Badge>
                           )}
                           {estimationStatus === "rejected" && (
                             <div className="bg-rose-900/30 border border-rose-700 rounded-lg p-3 w-full text-sm mt-2">
                               <Badge className="bg-rose-600 text-white mb-2">Estimasi Ditolak ❌</Badge>
                               <p className="text-rose-400 font-semibold">Alasan Pelanggan:</p>
                               <p className="text-slate-300">{estimationRejectReason}</p>
                               <p className="text-xs text-slate-400 mt-2 mb-3">Pelanggan telah menolak layanan ini. Anda dapat membatalkan layanan.</p>
                               <Button 
                                 size="sm" 
                                 onClick={handleCancelService} 
                                 disabled={actionLoading}
                                 className="bg-rose-600 hover:bg-rose-500 text-white text-xs"
                               >
                                 Batalkan Layanan
                               </Button>
                             </div>
                           )}
                           
                           {estimationStatus !== "pending" && estimationStatus !== "approved" && (
                             <Button 
                               size="sm" 
                               onClick={() => setShowEstimasiFormModal(true)} 
                               className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 mt-2"
                             >
                               📝 Buat Form Estimasi
                             </Button>
                           )}
                         </div>
                       )}
                       
                       {(!isMelepasPhase || (estimationStatus !== "pending" && estimationStatus !== "approved")) && (
                         <div className="flex gap-2">
                           {!isMelepasPhase && (
                             <>
                               <Button size="sm" onClick={() => setShowAddPartModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8">
                                 + Tambah Part
                               </Button>
                               <Button size="sm" onClick={() => setShowAddJasaModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8">
                                 + Tambah Jasa
                               </Button>
                             </>
                           )}
                         </div>
                       )}
                     </div>
                   )}

                   {/* Tabel ringkasan item - Di fase melepas tidak perlu tabel, hanya form saja. Tapi kalau ada invoiceItems, kita bisa tampilkan. */}
                   {(!isMelepasPhase || estimationStatus === "pending" || estimationStatus === "approved") && (
                     invoiceItems.length > 0 ? (
                       <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950">
                         <table className="w-full text-xs text-left text-slate-300">
                           <thead className="text-[10px] text-slate-400 uppercase bg-slate-800 border-b border-slate-700">
                             <tr>
                               <th className="px-2 py-2 text-center">No</th>
                               <th className="px-2 py-2">Nama</th>
                               <th className="px-2 py-2">Jenis</th>
                               <th className="px-2 py-2 text-center">Qty</th>
                               <th className="px-2 py-2 text-right">Harga</th>
                               {isMerasangPhase && <th className="px-2 py-2 text-center w-10"></th>}
                             </tr>
                           </thead>
                           <tbody>
                             {invoiceItems.map((item, index) => (
                               <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                 <td className="px-2 py-2 text-center">{index + 1}</td>
                                 <td className="px-2 py-2 font-medium text-slate-200">{item.name}</td>
                                 <td className="px-2 py-2">
                                   <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">{item.type}</span>
                                 </td>
                                 <td className="px-2 py-2 text-center">{item.qty}</td>
                                 <td className="px-2 py-2 text-right">Rp {(item.price * item.qty).toLocaleString("id-ID")}</td>
                                 {isMerasangPhase && (
                                   <td className="px-2 py-2 text-center">
                                     <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-300 transition-colors p-1">
                                       <Trash2 className="h-3.5 w-3.5" />
                                     </button>
                                   </td>
                                 )}
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     ) : (
                       !isMelepasPhase && (
                         <div className="text-center py-4 text-slate-500 text-xs border border-dashed border-slate-700 rounded-lg bg-slate-950">
                           Belum ada barang atau jasa ditambahkan
                         </div>
                       )
                     )
                   )}

                   {/* Total sementara */}
                   {(!isMelepasPhase || estimationStatus === "pending" || estimationStatus === "approved") && invoiceItems.length > 0 && (
                     <div className="flex flex-col items-end gap-3 mt-3">
                       <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                         <span className="text-slate-400">Total: </span>
                         <span className="text-emerald-400 font-bold">Rp {runningTotal.toLocaleString("id-ID")}</span>
                         </div>
                       </div>
                     )}

                     {/* DP Section */}
                     {invoiceItems.some(i => i.type === "Part-Inden") && (
                       <div className="mt-4 bg-slate-950 border border-slate-700 rounded-lg p-4">
                         <h4 className="text-sm font-semibold text-emerald-500 flex items-center gap-2 mb-3">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                           Status Pembayaran DP Part Inden
                         </h4>
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                           <div>
                             <span className="text-slate-400 mr-2">Status:</span>
                             {selectedRes?.dp_status === 'verified' && <Badge className="bg-emerald-600">Terverifikasi</Badge>}
                             {selectedRes?.dp_status === 'awaiting_verification' && <Badge className="bg-amber-600">Menunggu Verifikasi (Cek di atas)</Badge>}
                             {selectedRes?.dp_status === 'rejected' && <Badge className="bg-rose-600">Ditolak</Badge>}
                             {(!selectedRes?.dp_status || selectedRes?.dp_status === 'pending') && <Badge className="bg-slate-700">Belum Dibayar</Badge>}
                           </div>
                           <div className="flex items-center gap-2 mt-2 sm:mt-0">
                             <Button 
                               size="sm" 
                               onClick={() => {
                                 const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scorpionautoworks.my.id';
                                 const url = `${baseUrl}/payment/${selectedRes.id}`;
                                 navigator.clipboard.writeText(url);
                                 toast.success("Link pembayaran DP berhasil disalin! Kirimkan ke pelanggan.");
                               }}
                               className="bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-2"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                               Copy Link
                             </Button>
                             <Button 
                               size="sm" 
                               onClick={() => handleSendDpEmail(selectedRes!)}
                               disabled={isSendingDpEmail}
                               className="bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                               {isSendingDpEmail ? "Mengirim..." : "Kirim via Email"}
                             </Button>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>
               )}

               <p className="mt-4 pt-2 border-t border-slate-800 text-slate-400">{selectedRes?.problem_description}</p>
             </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 border-t border-slate-800 pt-4 mt-2">
            <div>
              {(hasEscalateButton || selectedRes?.checkup_description || selectedRes?.customer_checkup_response === 'Lanjut Reparasi') && (
                <Button variant="destructive" onClick={() => setShowEscalatePopup(true)} className="bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20">
                  Escalate
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleCloseDetail} className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">
                Tutup
              </Button>
              
              {!isLastPhase && (
                <Button 
                  onClick={handleLanjutProgress} 
                  disabled={isMelepasPhase && estimationStatus !== "approved"}
                  className={(isMelepasPhase && estimationStatus !== "approved") ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 text-white"}
                >
                  Lanjut progress
                </Button>
              )}

              <Button 
                onClick={openInvoice} 
                disabled={!(isLastPhase || (isCheckup && selectedRes?.customer_checkup_response === 'Selesai / Tanpa Perbaikan')) || actionLoading} 
                className={(isLastPhase || (isCheckup && selectedRes?.customer_checkup_response === 'Selesai / Tanpa Perbaikan')) ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"}
              >
                Selesaikan Servis
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL INVOICE (READ-ONLY SUMMARY) ================= */}
      <AlertDialog open={showInvoiceModal}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 w-full !max-w-[95vw] md:!max-w-4xl lg:!max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 print:hidden">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <img src="/scorpionlogo.png" alt="Scorpion Autoworks Logo" className="h-12 w-auto object-contain" />
              </div>
              <span className="text-2xl font-bold text-white text-right">Invoice</span>
            </AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-6 print:py-0">
            {/* Info Pelanggan */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm text-slate-300 print:bg-transparent print:border-none print:p-0 print:text-black">
              <div>
                <p className="mb-1"><strong>Nama Pelanggan:</strong> {selectedRes?.customer_name}</p>
                <p className="mb-1"><strong>Telepon:</strong> {selectedRes?.customer_phone || '-'}</p>
                <p className="mb-1"><strong>Kendaraan:</strong> {selectedRes?.vehicle_info}</p>
                <p><strong>Jenis Servis:</strong> <span className="text-emerald-400">{selectedRes?.service_type}</span></p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-slate-500">ID Reservasi</p>
                <p className="text-slate-300 font-bold">{selectedRes?.id}</p>
              </div>
            </div>

            {/* Tabel Item Invoice (Read-Only) */}
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
                  {invoiceItems.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-slate-500">Tidak ada item dalam invoice</td></tr>
                  ) : (
                    invoiceItems.map((item, index) => (
                      <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-center whitespace-nowrap">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-200">{item.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><Badge className="bg-slate-700 text-slate-300">{item.type}</Badge></td>
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
            <div className="flex justify-end items-center">
              <div className="bg-slate-800 px-4 sm:px-6 py-3 rounded-lg border border-slate-700 flex gap-2 sm:gap-4 items-center flex-wrap sm:flex-nowrap justify-end">
                <span className="text-slate-400 font-medium whitespace-nowrap">Total Keseluruhan:</span>
                <span className="text-xl sm:text-2xl text-emerald-400 font-bold whitespace-nowrap">
                  Rp {runningTotal.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="sm:justify-between w-full flex-col sm:flex-row gap-4 mt-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()} className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white flex gap-2">
                <Printer className="w-4 h-4" />
                Print
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowInvoiceModal(false)} className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">
                Batal
              </Button>
              <Button onClick={executeFinishInvoice} disabled={actionLoading} className="bg-blue-600 hover:bg-blue-500 text-white">
                {actionLoading ? "Memproses..." : "Selesai"}
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================= PRINT ONLY INVOICE ================= */}
      {showInvoiceModal && selectedRes && (
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
                background-color: #0f172a !important;
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
                <p className="mb-1"><strong>Nama Pelanggan:</strong> {selectedRes.customer_name}</p>
                <p className="mb-1"><strong>Telepon:</strong> {selectedRes.customer_phone || '-'}</p>
                <p className="mb-1"><strong>Kendaraan:</strong> {selectedRes.vehicle_info}</p>
                <p className="mb-1"><strong>Jenis Servis:</strong> <span className="text-emerald-400">{selectedRes.service_type}</span></p>
              </div>
              <div className="text-right">
                <p className="mb-1"><strong>Tanggal Booking:</strong> {new Date(selectedRes.booking_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="mb-1"><strong>Waktu:</strong> {new Date(selectedRes.booking_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                {selectedRes.tracking_code && (
                  <p className="mb-1 mt-2"><strong>Kode Tracking:</strong> <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white">{selectedRes.tracking_code}</span></p>
                )}
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
                  {invoiceItems.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-slate-500">Tidak ada item</td></tr>
                  ) : (
                    invoiceItems.map((item, index) => (
                      <tr key={item.id} className="border-b border-slate-800">
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
                  Rp {runningTotal.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL TAMBAH PART ================= */}
      <Dialog open={showAddPartModal} onOpenChange={setShowAddPartModal}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg text-slate-200">Pilih Sumber Part</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button variant="outline" onClick={() => { setShowAddPartModal(false); setShowPartCustModal(true); }} className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white justify-start h-12">
              Part dari customer
            </Button>
            <Button variant="outline" onClick={fetchInventory} className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white justify-start h-12">
              Part dari inventory bengkel
            </Button>
            <Button variant="outline" onClick={() => { setShowAddPartModal(false); setShowPartIndenModal(true); }} className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white justify-start h-12">
              <svg className="w-4 h-4 mr-2 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Part Pre-order / Inden (DP 50%)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Part Customer */}
      <Dialog open={showPartCustModal} onOpenChange={setShowPartCustModal}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg text-emerald-500">Part dari Customer</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Nama Part</label>
              <input type="text" value={partCustName} onChange={(e) => setPartCustName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 outline-none" placeholder="Contoh: Oli Mesin Motul..." />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Jenis Item</label>
              <select value={partCustItemType} onChange={(e) => setPartCustItemType(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 outline-none">
                <option value="">-- Pilih Jenis Item --</option>
                <option value="Engine Component">Engine Component</option>
                <option value="Understeel (Suspension)">Understeel (Suspension)</option>
                <option value="Understeel (Brakes)">Understeel (Brakes)</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitPartCustomer} className="w-full bg-emerald-600 hover:bg-emerald-500">Lanjut</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Part Inventory */}
      <Dialog open={showPartInvModal} onOpenChange={setShowPartInvModal}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg text-emerald-500">Pilih Part dari Inventory</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" value={invSearch} onChange={(e) => setInvSearch(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-slate-200 focus:border-emerald-500 outline-none" placeholder="Cari nama part..." />
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
              {loadingInventory ? (
                <p className="text-slate-500 text-center py-4 animate-pulse">Memuat data inventory...</p>
              ) : filteredInventory.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Part tidak ditemukan atau stok habis.</p>
              ) : (
                filteredInventory.map((item) => (
                  <div key={item.id} onClick={() => { setSelectedInvItem(item); setShowPartInvModal(false); setShowInvQtyModal(true); }} className="flex justify-between items-center bg-slate-950 border border-slate-800 p-3 rounded-lg cursor-pointer hover:border-emerald-500 group">
                    <div>
                      <p className="text-slate-200 font-medium group-hover:text-emerald-400">{item.name}</p>
                      <p className="text-xs text-slate-500">Sisa Stok: <span className="text-slate-300 font-bold">{item.stock_count}</span></p>
                    </div>
                    <p className="text-slate-300 text-sm">Rp {item.price?.toLocaleString("id-ID") || 0}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Jumlah Inventory */}
      <Dialog open={showInvQtyModal} onOpenChange={setShowInvQtyModal}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg text-emerald-500">Masukkan Jumlah Part</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-300 text-sm mb-4">Part: <strong className="text-emerald-400">{selectedInvItem?.name}</strong> (Maks: {selectedInvItem?.stock_count})</p>
            <label className="block text-sm text-slate-400 mb-2">Jumlah</label>
            <input type="number" min="1" max={selectedInvItem?.stock_count} value={invQty} onChange={(e) => setInvQty(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 outline-none" placeholder="Ketik jumlah..." />
          </div>
          <DialogFooter>
            <Button onClick={submitPartInventoryQty} className="w-full bg-emerald-600 hover:bg-emerald-500">Lanjut</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL TAMBAH JASA ================= */}
      <Dialog open={showAddJasaModal} onOpenChange={setShowAddJasaModal}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg text-emerald-500">Tambah Jasa</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Nama Jasa</label>
              <input type="text" value={jasaName} onChange={(e) => setJasaName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 outline-none" placeholder="Contoh: Ongkos Ganti Oli..." />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Harga Jasa (Rp)</label>
              <input type="number" min="0" value={jasaPrice} onChange={(e) => setJasaPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 outline-none" placeholder="Contoh: 50000" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitJasa} className="w-full bg-emerald-600 hover:bg-emerald-500">Lanjut</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL PART INDEN (DP 50%) ================= */}
      <Dialog open={showPartIndenModal} onOpenChange={setShowPartIndenModal}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-emerald-500 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Part Pre-order / Inden (DP 50%)
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Nama Part</label>
              <input type="text" value={indenName} onChange={(e) => setIndenName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 outline-none" placeholder="Contoh: Shock Absorber Bilstein..." />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Jenis Item</label>
              <select value={indenItemType} onChange={(e) => setIndenItemType(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 outline-none">
                <option value="">-- Pilih Jenis Item --</option>
                <option value="Engine Component">Engine Component</option>
                <option value="Understeel (Suspension)">Understeel (Suspension)</option>
                <option value="Understeel (Brakes)">Understeel (Brakes)</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Estimasi Harga Total (Rp)</label>
              <input type="number" min="0" value={indenPriceTotal} onChange={(e) => setIndenPriceTotal(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500 outline-none" placeholder="Contoh: 1000000" />
            </div>

            {/* Visual Feedback: Kalkulasi DP */}
            {indenPriceTotal && Number(indenPriceTotal) > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Estimasi Total:</span>
                  <span className="text-slate-200 font-medium">Rp {Number(indenPriceTotal).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-400 font-semibold">DP (50%) yang ditagihkan:</span>
                  <span className="text-emerald-400 font-bold text-base">Rp {Math.round(Number(indenPriceTotal) / 2).toLocaleString("id-ID")}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={submitPartInden} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">Tambahkan ke Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ================= MODAL JASA KOMPLEKSITAS ================= */}
      <Dialog open={showKompleksitasModal} onOpenChange={(open) => {
        if (!open) {
          // Jika ditutup tanpa submit, tetap tambahkan jasa dengan base price saja
          if (pendingJasaItem && pendingInvoiceItems.length > 0) {
            const finalItems = [...pendingInvoiceItems, pendingJasaItem];
            setInvoiceItems(finalItems);
            saveInvoiceToDb(finalItems);
          }
          setShowKompleksitasModal(false);
          setPendingInvoiceItems([]);
          setPendingJasaItem(null);
          setKompleksitasPrice(0);
        }
      }}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg text-amber-500 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              Jasa Kompleksitas
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Info jasa base */}
            {pendingJasaItem && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                <p className="text-xs text-slate-400">Jasa Bongkar/Pasang otomatis ditambahkan:</p>
                <p className="text-sm text-slate-200 font-medium">{pendingJasaItem.name}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Harga Dasar:</span>
                  <span className="text-emerald-400 font-bold">Rp {pendingJasaItem.price.toLocaleString("id-ID")}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-400 mb-2">Tambahan Harga Kompleksitas (Rp)</label>
              <input
                type="number"
                min="0"
                value={kompleksitasPrice}
                onChange={(e) => setKompleksitasPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-amber-500 outline-none"
                placeholder="Contoh: 50000 (isi 0 jika tidak ada)"
              />
              <p className="text-xs text-slate-500 mt-1">Biaya tambahan untuk kompleksitas kerja (misal: baut berkarat, akses sulit, dll)</p>
            </div>

            {/* Visual Feedback: Total kalkulasi */}
            {pendingJasaItem && (
              <div className="bg-slate-950 border border-amber-500/30 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Harga Dasar:</span>
                  <span className="text-slate-200">Rp {pendingJasaItem.price.toLocaleString("id-ID")}</span>
                </div>
                {Number(kompleksitasPrice || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-400">+ Kompleksitas:</span>
                    <span className="text-amber-400">Rp {Number(kompleksitasPrice).toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1 border-t border-slate-800">
                  <span className="text-emerald-400 font-semibold">Total Jasa:</span>
                  <span className="text-emerald-400 font-bold text-base">Rp {(pendingJasaItem.price + Number(kompleksitasPrice || 0)).toLocaleString("id-ID")}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!pendingJasaItem || pendingInvoiceItems.length === 0) return;
                const finalJasa = {
                  ...pendingJasaItem,
                  price: pendingJasaItem.price + Number(kompleksitasPrice || 0)
                };
                // Jika ada kompleksitas, ubah nama untuk kejelasan
                if (Number(kompleksitasPrice || 0) > 0) {
                  finalJasa.name = `${pendingJasaItem.name} + Kompleksitas`;
                }
                const finalItems = [...pendingInvoiceItems, finalJasa];
                setInvoiceItems(finalItems);
                saveInvoiceToDb(finalItems);
                setShowKompleksitasModal(false);
                setPendingInvoiceItems([]);
                setPendingJasaItem(null);
                setKompleksitasPrice(0);
              }}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
            >
              Tambahkan ke Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EXISTING POP-UPS (Kendala & Escalate) */}
      <AlertDialog open={showKendalaPopup}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-center sm:max-w-sm">
          {/* Tombol X untuk menutup tanpa memajukan fase */}
          <button
            onClick={() => {
              setShowKendalaPopup(false);
              // Fase tetap di "Pengecekan awal" — tidak ada perubahan
            }}
            style={{ position: 'absolute', right: '16px', top: '16px', zIndex: 50 }}
            className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-white text-center">Apa ada kendala?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center flex-row gap-4 pt-4">
            <Button variant="outline" disabled={checkupEmailLoading} onClick={async () => {
              // No issues found — advance phase THEN send "Mobil siap diambil" email
              setCheckupEmailLoading(true);
              try {
                // Advance ke "Pengecekan selesai" sekarang
                await advanceCheckupPhase();

                if (selectedRes?.customer_email) {
                  await fetch('/api/send-service-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      customerName: selectedRes.customer_name,
                      customerEmail: selectedRes.customer_email,
                      vehicleInfo: selectedRes.vehicle_info,
                      vehicleYear: selectedRes.vehicle_year || '-',
                      serviceType: selectedRes.service_type,
                      currentPhase: 'Pengecekan selesai',
                      isCompleted: false,
                      isCheckupResult: true,
                      hasIssues: false,
                      trackingCode: selectedRes.tracking_code || null,
                    }),
                  });
                }
                toast.success("Email 'Mobil siap diambil' terkirim ke pelanggan.");
              } catch (err) {
                console.error(err);
                toast.error("Gagal mengirim email.");
              } finally {
                setCheckupEmailLoading(false);
                setShowKendalaPopup(false);
              }
            }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border-slate-700">
              {checkupEmailLoading ? "Mengirim..." : "Tidak"}
            </Button>
            <Button variant="destructive" onClick={() => { setShowKendalaPopup(false); setShowKendalaFormPopup(true); }} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white">
              Ya
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 2. Pop-up Form Kendala (Mandatory) */}
      <AlertDialog open={showKendalaFormPopup}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          {/* Tombol X untuk menutup tanpa memajukan fase */}
          <button
            onClick={() => {
              setShowKendalaFormPopup(false);
              setKendalaType("");
              setKendalaDesc("");
              setKendalaImageFile(null);
              // Fase tetap di "Pengecekan awal"
            }}
            style={{ position: 'absolute', right: '16px', top: '16px', zIndex: 50 }}
            className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-emerald-500">Laporan Kendala</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="radio" name="kendalaType" value="Reparasi" checked={kendalaType === "Reparasi"} onChange={(e) => setKendalaType(e.target.value as any)} className="accent-emerald-500 w-4 h-4" /> Reparasi
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="radio" name="kendalaType" value="Servis" checked={kendalaType === "Servis"} onChange={(e) => setKendalaType(e.target.value as any)} className="accent-emerald-500 w-4 h-4" /> Servis
              </label>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Upload Foto (Opsional)</label>
              <input type="file" accept="image/*" onChange={(e) => setKendalaImageFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Deskripsi Kendala</label>
              <textarea rows={3} value={kendalaDesc} onChange={(e) => setKendalaDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-emerald-500 resize-none" placeholder="Jelaskan detail kendala..." />
            </div>
          </div>
          <AlertDialogFooter>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => {
              if (!kendalaType || !kendalaDesc.trim()) { toast.error("Mohon pilih opsi dan isi deskripsi."); return; }
              setShowKendalaFormPopup(false);
              setShowKirimEmailPopup(true);
            }}>
              Submit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 3. Pop-up Kirim Email Notifikasi (Mandatory) */}
      <AlertDialog open={showKirimEmailPopup}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-center sm:max-w-sm">
          {/* Tombol X untuk menutup tanpa memajukan fase */}
          <button
            onClick={() => {
              setShowKirimEmailPopup(false);
              // Fase tetap di "Pengecekan awal"
            }}
            style={{ position: 'absolute', right: '16px', top: '16px', zIndex: 50 }}
            className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-white text-center">Konfirmasi Laporan</AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              Anda merekomendasikan: <strong className="text-emerald-400">{kendalaType}</strong><br/><br/>Email notifikasi akan dikirim ke pelanggan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <Button disabled={checkupEmailLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white" onClick={async () => {
              setCheckupEmailLoading(true);
              try {
                let imageUrl: string | null = null;

                // Upload image to Supabase Storage if present
                if (kendalaImageFile) {
                  const fileExt = kendalaImageFile.name.split('.').pop();
                  const fileName = `${selectedRes.id}_${Date.now()}.${fileExt}`;
                  const { error: uploadError } = await supabase.storage
                    .from('checkup-images')
                    .upload(fileName, kendalaImageFile);
                  
                  if (uploadError) {
                    console.error("Upload error:", uploadError);
                    toast.error("Gagal upload foto, tapi email tetap dikirim.");
                  } else {
                    const { data: urlData } = supabase.storage
                      .from('checkup-images')
                      .getPublicUrl(fileName);
                    imageUrl = urlData.publicUrl;
                  }
                }

                // Save to database
                await supabase.from("bookings").update({
                  checkup_description: kendalaDesc,
                  checkup_image_url: imageUrl,
                  updated_at: new Date().toISOString(),
                }).eq("id", selectedRes.id);

                // Send email with checkup results
                if (selectedRes.customer_email) {
                  await fetch('/api/send-service-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      customerName: selectedRes.customer_name,
                      customerEmail: selectedRes.customer_email,
                      vehicleInfo: selectedRes.vehicle_info,
                      vehicleYear: selectedRes.vehicle_year || '-',
                      serviceType: selectedRes.service_type,
                      currentPhase: 'Pengecekan selesai (Menunggu Respon)',
                      isCompleted: false,
                      isCheckupResult: true,
                      hasIssues: true,
                      checkupDesc: kendalaDesc,
                      checkupImage: imageUrl,
                      bookingId: selectedRes.id,
                      trackingCode: selectedRes.tracking_code || null,
                    }),
                  });
                }

                // Update local state
                // Advance ke "Pengecekan selesai" sekarang setelah kendala dilaporkan
                await advanceCheckupPhase();

                setSelectedRes({ ...selectedRes, checkup_description: kendalaDesc, checkup_image_url: imageUrl });
                setShowKirimEmailPopup(false);
                setHasEscalateButton(true);
                fetchBookings();
                toast.success("Email kendala terkirim ke pelanggan!");
              } catch (err: any) {
                console.error(err);
                toast.error("Gagal mengirim: " + (err.message || "Unknown error"));
              } finally {
                setCheckupEmailLoading(false);
              }
            }}>
              {checkupEmailLoading ? "Mengirim..." : "Kirim"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 4. Pop-up Escalate Form (Mandatory) */}
      <AlertDialog open={showEscalatePopup}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 sm:max-w-sm">
          {/* Tombol X untuk menutup */}
          <button
            onClick={() => {
              setShowEscalatePopup(false);
              setEscalateChoice("");
            }}
            style={{ position: 'absolute', right: '16px', top: '16px', zIndex: 50 }}
            className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-rose-500">Eskalasi Layanan</AlertDialogTitle>
            <AlertDialogDescription>Pilih jenis layanan lanjutan untuk kendaraan ini:</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <label className="flex items-center gap-3 text-slate-300 cursor-pointer bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-slate-600">
              <input type="radio" name="escalateChoice" value="Reparasi" checked={escalateChoice === "Reparasi"} onChange={(e) => setEscalateChoice(e.target.value as any)} className="accent-rose-500 w-4 h-4" /> Repair / Perbaikan Komponen
            </label>
            <label className="flex items-center gap-3 text-slate-300 cursor-pointer bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-slate-600">
              <input type="radio" name="escalateChoice" value="Servis" checked={escalateChoice === "Servis"} onChange={(e) => setEscalateChoice(e.target.value as any)} className="accent-rose-500 w-4 h-4" /> Servis Rutin
            </label>
          </div>
          <AlertDialogFooter>
            <Button className="w-full bg-rose-600 hover:bg-rose-500 text-white" onClick={() => {
              if (!escalateChoice) { toast.error("Mohon pilih jenis eskalasi."); return; }
              setShowEscalatePopup(false);
              setShowSetujuEscalatePopup(true);
            }}>
              Submit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 5. Pop-up Final Persetujuan Escalate (Mandatory) */}
      <AlertDialog open={showSetujuEscalatePopup}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-center sm:max-w-sm">
          {/* Tombol X untuk menutup */}
          <button
            onClick={() => {
              setShowSetujuEscalatePopup(false);
            }}
            style={{ position: 'absolute', right: '16px', top: '16px', zIndex: 50 }}
            className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-white text-center">Konfirmasi Perubahan</AlertDialogTitle>
            <AlertDialogDescription className="text-center">Jenis layanan akan diubah menjadi:</AlertDialogDescription>
            <div className="font-bold text-emerald-400 bg-slate-950 py-3 mt-4 rounded border border-slate-800">
              {escalateChoice === "Reparasi" ? "Repair / Perbaikan Komponen" : "Servis Rutin"}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center mt-2">
            <Button onClick={handleEscalateConfirm} disabled={actionLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
              {actionLoading ? "Memproses..." : "Setuju"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* DIALOG FORM ESTIMASI */}
      <Dialog open={showEstimasiFormModal} onOpenChange={setShowEstimasiFormModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-emerald-500">Form Estimasi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Estimasi Biaya Parts (Rp)</label>
              <input 
                type="number" 
                value={estimasiPart} 
                onChange={(e) => setEstimasiPart(Number(e.target.value) || "")} 
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white" 
                placeholder="Contoh: 1500000"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Estimasi Biaya Jasa (Rp)</label>
              <input 
                type="number" 
                value={estimasiJasa} 
                onChange={(e) => setEstimasiJasa(Number(e.target.value) || "")} 
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white" 
                placeholder="Contoh: 500000"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Keterangan (Opsional)</label>
              <textarea 
                value={estimasiNotes} 
                onChange={(e) => setEstimasiNotes(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white min-h-[100px]" 
                placeholder="Catatan untuk pelanggan terkait estimasi..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEstimasiFormModal(false)} className="bg-slate-800 text-white hover:bg-slate-700">Batal</Button>
            <Button onClick={submitEstimasiForm} disabled={estimationEmailLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              {estimationEmailLoading ? "Mengirim..." : "Kirim Estimasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL DP VERIFICATION ================= */}
      <Dialog open={showDpVerificationModal} onOpenChange={setShowDpVerificationModal}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg text-emerald-500">Verifikasi Bukti DP</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-slate-300 text-sm">
              Pesanan atas nama <strong className="text-emerald-400">{dpVerificationRes?.customer_name}</strong>
            </p>
            {dpVerificationRes?.dp_proof_url ? (
              <div className="border border-slate-700 rounded-lg p-2 bg-slate-950">
                {dpVerificationRes.dp_proof_url.toLowerCase().endsWith('.pdf') ? (
                  <div className="flex flex-col items-center justify-center p-8">
                    <svg className="w-16 h-16 text-rose-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    <a href={dpVerificationRes.dp_proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline text-sm">
                      Buka Dokumen PDF
                    </a>
                  </div>
                ) : (
                  <img src={dpVerificationRes.dp_proof_url} alt="Bukti Transfer" className="w-full max-h-[60vh] object-contain rounded" />
                )}
              </div>
            ) : (
              <p className="text-rose-500 text-sm text-center py-8">Bukti transfer tidak ditemukan.</p>
            )}
          </div>
          <DialogFooter className="flex-row sm:justify-between gap-2">
            <Button 
              variant="destructive" 
              onClick={handleRejectDp}
              disabled={dpActionLoading}
              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white"
            >
              {dpActionLoading ? "Loading..." : "Tolak"}
            </Button>
            <Button 
              onClick={handleVerifyDp}
              disabled={dpActionLoading}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {dpActionLoading ? "Loading..." : "Verifikasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}