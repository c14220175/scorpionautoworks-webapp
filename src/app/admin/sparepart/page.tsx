"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search } from "lucide-react";

export default function SparepartPage() {
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterItemType, setFilterItemType] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<"all" | "available" | "low">("all");

  // State Pop-up
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isAddNewOpen, setIsAddNewOpen] = useState(false);

  // Form State: Tambah Stok (Barang Lama)
  const [selectedItemId, setSelectedItemId] = useState("");
  const [addStockAmount, setAddStockAmount] = useState("");

  // Form State: Tambah Produk Baru
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<string>("");
  const [newItemCategory, setNewItemCategory] = useState<string>("");
  const [customItemType, setCustomItemType] = useState("");
  const [customItemCategory, setCustomItemCategory] = useState("");
  const [newItemVendor, setNewItemVendor] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemStock, setNewItemStock] = useState("");

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("inventory").select("*").gt("stock_count", 0).order("name", { ascending: true });
      if (error) throw error;
      if (data) setItems(data);
    } catch (error: any) {
      toast.error("Gagal memuat data sparepart: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Derive unique filter options dynamically from data
  const uniqueCategories = useMemo(() => {
    const cats = [...new Set(items.map((i) => i.category).filter(Boolean))];
    return ["all", ...cats.sort()];
  }, [items]);

  const uniqueItemTypes = useMemo(() => {
    const types = [...new Set(items.map((i) => i.item_type).filter(Boolean))];
    return ["all", ...types.sort()];
  }, [items]);

  // Derive unique options for form dropdowns (existing values in DB)
  const formItemTypeOptions = useMemo(() => {
    return [...new Set(items.map((i) => i.item_type).filter(Boolean))].sort();
  }, [items]);

  const formCategoryOptions = useMemo(() => {
    return [...new Set(items.map((i) => i.category).filter(Boolean))].sort();
  }, [items]);

  const filteredItems = items.filter((item) => {
    // Search filter
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query ||
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      (item.vendor || "").toLowerCase().includes(query);

    // Category filter
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;

    // Item type filter
    const matchesItemType = filterItemType === "all" || item.item_type === filterItemType;

    // Stock filter
    let matchesStock = true;
    if (filterStock === "available") matchesStock = item.stock_count >= 2;
    else if (filterStock === "low") matchesStock = item.stock_count === 1;

    return matchesSearch && matchesCategory && matchesItemType && matchesStock;
  });

  // Dropdown hanya memunculkan barang yang stock_count >= 1
  const availableItemsToAddStock = items.filter(item => item.stock_count >= 1);

  const handleAddStock = async () => {
    if (!selectedItemId || !addStockAmount || parseInt(addStockAmount) <= 0) {
      toast.error("Mohon pilih barang dan masukkan jumlah yang valid.");
      return;
    }
    setActionLoading(true);
    try {
      const itemToUpdate = items.find(i => i.id.toString() === selectedItemId);
      const newStock = itemToUpdate.stock_count + parseInt(addStockAmount);

      const { error } = await supabase.from("inventory").update({ stock_count: newStock }).eq("id", itemToUpdate.id);
      if (error) throw error;

      toast.success(`Stok ${itemToUpdate.name} berhasil ditambah!`);
      setIsAddStockOpen(false);
      setSelectedItemId("");
      setAddStockAmount("");
      fetchInventory();
    } catch (error: any) {
      toast.error("Gagal menambah stok: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNewItem = async () => {
    const finalItemType = newItemType === "__other__" ? customItemType.trim() : newItemType;
    const finalCategory = newItemCategory === "__other__" ? customItemCategory.trim() : newItemCategory;

    if (!newItemName || !finalItemType || !finalCategory || !newItemVendor || !newItemPrice || !newItemStock) {
      toast.error("Semua field wajib diisi!");
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.from("inventory").insert([{
        name: newItemName,
        item_type: finalItemType,
        category: finalCategory,
        vendor: newItemVendor,
        price: parseFloat(newItemPrice),
        stock_count: parseInt(newItemStock)
      }]);
      if (error) throw error;

      toast.success("Barang baru berhasil ditambahkan!");
      setIsAddNewOpen(false);

      setNewItemName(""); setNewItemType(""); setNewItemCategory(""); setNewItemVendor(""); setNewItemPrice(""); setNewItemStock("");
      setCustomItemType(""); setCustomItemCategory("");
      fetchInventory();
    } catch (error: any) {
      toast.error("Gagal menambah produk: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(angka);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-100">Inventory Sparepart</h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari sparepart..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 py-2 pl-9 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm"
              >
                ✕
              </button>
            )}
          </div>
          <Button variant="outline" onClick={() => setIsAddStockOpen(true)} className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
            Add to produk
          </Button>
          <Button onClick={() => setIsAddNewOpen(true)} className="bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold">
            Tambah Produk Baru
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        {/* Category Filter (Dynamic) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Kategori:</span>
          <div className="flex gap-1.5 flex-wrap">
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterCategory === cat
                    ? "bg-yellow-500/15 border-yellow-500/50 text-yellow-500"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
              >
                {cat === "all" ? "Semua" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Item Type Filter (Dynamic) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Jenis:</span>
          <div className="flex gap-1.5 flex-wrap">
            {uniqueItemTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilterItemType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterItemType === type
                    ? "bg-sky-500/15 border-sky-500/50 text-sky-400"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
              >
                {type === "all" ? "Semua" : type}
              </button>
            ))}
          </div>
        </div>

        {/* Stock Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Stok:</span>
          <div className="flex gap-1.5">
            {([
              { value: "all", label: "Semua" },
              { value: "available", label: "Tersedia" },
              { value: "low", label: "Rendah (1)" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterStock(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterStock === opt.value
                    ? opt.value === "low" ? "bg-orange-500/15 border-orange-500/50 text-orange-400"
                      : "bg-yellow-500/15 border-yellow-500/50 text-yellow-500"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Result count */}
        <div className="flex items-center ml-auto">
          <span className="text-xs text-slate-500">
            {filteredItems.length} dari {items.length} item
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 animate-pulse">Memuat data inventory...</div>
      ) : filteredItems.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800"><CardContent className="text-center py-20 text-slate-500">Tidak ada barang ditemukan.</CardContent></Card>
      ) : (
        <Card className="bg-slate-900 border-slate-800 rounded-xl">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm text-left text-slate-400">
              <thead className="text-xs text-slate-300 uppercase bg-slate-800">
                <tr>
                  <th className="px-4 sm:px-6 py-4">Nama Barang</th>
                  <th className="px-4 sm:px-6 py-4">Jenis Item</th>
                  <th className="px-4 sm:px-6 py-4">Kategori Item</th>
                  <th className="px-4 sm:px-6 py-4">Tempat Beli</th>
                  <th className="px-4 sm:px-6 py-4">Harga</th>
                  <th className="px-4 sm:px-6 py-4">Stok</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="px-4 sm:px-6 py-4 font-bold text-slate-200">{item.name}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <Badge variant="outline" className="text-sky-400 border-sky-400/50">
                        {item.item_type || '-'}
                      </Badge>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <Badge variant="outline" className={item.category === "Fast Moving Parts" ? "text-orange-400 border-orange-400/50" : "text-emerald-400 border-emerald-400/50"}>
                        {item.category}
                      </Badge>
                    </td>
                    <td className="px-4 sm:px-6 py-4">{item.vendor}</td>
                    <td className="px-4 sm:px-6 py-4 text-yellow-500 font-medium whitespace-nowrap">{formatRupiah(item.price)}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className={`px-2 py-1 rounded font-bold ${item.stock_count <= 1 && item.category === "Fast Moving Parts" ? "bg-red-500/20 text-red-500" : "text-slate-200"}`}>
                        {item.stock_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* POP-UP: Add to produk */}
      <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-lg text-slate-100">Tambah Stok Produk</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Pilih Barang (Stok &ge; 1)</label>
              <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-yellow-500">
                <option value="">-- Pilih Barang --</option>
                {availableItemsToAddStock.map(item => (
                  <option key={item.id} value={item.id}>{item.name} (Stok saat ini: {item.stock_count})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Jumlah Tambahan Stok</label>
              <input type="number" min="1" value={addStockAmount} onChange={(e) => setAddStockAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-yellow-500" placeholder="Misal: 10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStockOpen(false)} className="bg-transparent border-slate-700 text-slate-300">Batal</Button>
            <Button onClick={handleAddStock} disabled={actionLoading} className="bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold">Tambah Stok</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POP-UP: Tambah Produk Baru */}
      <Dialog open={isAddNewOpen} onOpenChange={setIsAddNewOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-lg text-yellow-500">Tambah Produk Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nama Barang</label>
              <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-yellow-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Jenis Item</label>
              <select value={newItemType} onChange={(e) => { setNewItemType(e.target.value); if (e.target.value !== "__other__") setCustomItemType(""); }} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-yellow-500">
                <option value="">-- Pilih Jenis Item --</option>
                {formItemTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="__other__">Lainnya (Ketik Manual)</option>
              </select>
              {newItemType === "__other__" && (
                <input
                  type="text"
                  value={customItemType}
                  onChange={(e) => setCustomItemType(e.target.value)}
                  placeholder="Ketik jenis item baru..."
                  className="w-full mt-2 bg-slate-950 border border-yellow-500/50 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-yellow-500"
                />
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Kategori Item</label>
              <select value={newItemCategory} onChange={(e) => { setNewItemCategory(e.target.value); if (e.target.value !== "__other__") setCustomItemCategory(""); }} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-yellow-500">
                <option value="">-- Pilih Kategori Item --</option>
                {formCategoryOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="__other__">Lainnya (Ketik Manual)</option>
              </select>
              {newItemCategory === "__other__" && (
                <input
                  type="text"
                  value={customItemCategory}
                  onChange={(e) => setCustomItemCategory(e.target.value)}
                  placeholder="Ketik kategori item baru..."
                  className="w-full mt-2 bg-slate-950 border border-yellow-500/50 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-yellow-500"
                />
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Tempat Beli</label>
              <input type="text" value={newItemVendor} onChange={(e) => setNewItemVendor(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-yellow-500" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-slate-400 mb-1">Harga (Rp)</label>
                <input type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-yellow-500" />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-slate-400 mb-1">Jumlah stok baru</label>
                <input type="number" min="1" value={newItemStock} onChange={(e) => setNewItemStock(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-yellow-500" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setIsAddNewOpen(false)} className="bg-transparent border-slate-700 text-slate-300">Batal</Button>
            <Button onClick={handleAddNewItem} disabled={actionLoading} className="bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold">Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}