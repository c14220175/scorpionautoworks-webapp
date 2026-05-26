'use client'

import { useState, useEffect, ChangeEvent } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { toWIBISOString, getHourWIB } from '@/utils/formatWIB'

type CarModel = { name: string; years: number[]; variants: string[]; };
type CarBrand = { brand: string; models: CarModel[]; };



export default function BookingPage() {
  const supabase = createClient()

  const [mounted, setMounted] = useState(false)
  const [carData, setCarData] = useState<CarBrand[]>([])
  const [availableModels, setAvailableModels] = useState<CarModel[]>([])
  const [availableTrims, setAvailableTrims] = useState<string[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])

  const [selectedDate, setSelectedDate] = useState<string>('')
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [isDateFullyBooked, setIsDateFullyBooked] = useState<boolean>(false)
  const [isCheckingTime, setIsCheckingTime] = useState<boolean>(false)
  const [todayString, setTodayString] = useState<string>('')
  const [isHolidayError, setIsHolidayError] = useState<string | null>(null)

  const [holidaysMap, setHolidaysMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;

        const [resCurrent, resNext] = await Promise.all([
          fetch(`/api/holidays?year=${currentYear}`),
          fetch(`/api/holidays?year=${nextYear}`)
        ]);

        const dataCurrent = await resCurrent.json();
        const dataNext = await resNext.json();

        const newHolidaysMap: Record<string, string> = {};

        if (dataCurrent.status === "success") {
          dataCurrent.data.forEach((h: any) => {
            newHolidaysMap[h.date] = h.description;
          });
        }

        if (dataNext.status === "success") {
          dataNext.data.forEach((h: any) => {
            newHolidaysMap[h.date] = h.description;
          });
        }

        try {
          const { data: closedDays, error } = await supabase
            .from('closed_days')
            .select('closed_date, reason');

          if (!error && closedDays) {
            closedDays.forEach((cd: any) => {
              newHolidaysMap[cd.closed_date] = cd.reason || 'Bengkel Tutup';
            });
          }
        } catch (closedErr) {
          console.error("Gagal memuat data hari tutup dari database:", closedErr);
        }

        try {
          const { data: overrides, error } = await supabase
            .from('holiday_overrides')
            .select('override_date');

          if (!error && overrides) {
            overrides.forEach((o: any) => {
              delete newHolidaysMap[o.override_date];
            });
          }
        } catch (overrideErr) {
          console.error("Gagal memuat data override hari libur:", overrideErr);
        }

        setHolidaysMap(newHolidaysMap);
      } catch (err) {
        console.error("Gagal memuat data hari libur dari API:", err);
      }
    };

    fetchHolidays();
  }, []);

  const isPublicHoliday = (dateStr: string): string | null => {
    return holidaysMap[dateStr] ?? null
  }

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    brand: '',
    model: '',
    trim: '',
    year: '',
    serviceType: '',
    description: '',
    manualCarName: '',
    reservationTime: '',
    licensePlate: '',
  })

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isManualInput, setIsManualInput] = useState(false)



  // State untuk fitur "Cari Data Saya" via email
  const [isSearchingEmail, setIsSearchingEmail] = useState(false)
  const [emailSearchResult, setEmailSearchResult] = useState<'idle' | 'found' | 'not_found'>('idle')

  // State untuk popup pemilihan kendaraan
  type VehicleOption = { customer_name: string; vehicle_info: string; vehicle_year: number | null }
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([])
  const [showVehicleModal, setShowVehicleModal] = useState(false)

  // Ambil data mobil & load saved vehicles dari localStorage
  useEffect(() => {
    setMounted(true)

    // Set today string on client only to avoid hydration mismatch
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setTodayString(`${yyyy}-${mm}-${dd}`)

    fetch('/data/cars.json')
      .then((res) => res.json())
      .then((data) => setCarData(data))
      .catch((err) => console.error("Gagal memuat data mobil:", err))


  }, [])

  // LOGIKA PEMILIHAN TANGGAL & JAM (Fitur Baru)
  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimes([])
      return
    }

    const fetchAvailability = async () => {
      setIsCheckingTime(true)
      try {
        // Rentang waktu pencarian dalam 1 hari (format WIB / UTC+7)
        const startOfDay = new Date(`${selectedDate}T00:00:00+07:00`).toISOString()
        const endOfDay = new Date(`${selectedDate}T23:59:59+07:00`).toISOString()

        const { data, error } = await supabase
          .from('bookings')
          .select('booking_date')
          .gte('booking_date', startOfDay)
          .lte('booking_date', endOfDay)

        if (error) throw error

        // 1. Cek Kuota Harian (Maksimal 4)
        if (data.length >= 4) {
          setIsDateFullyBooked(true)
          setAvailableTimes([])
          return
        }

        setIsDateFullyBooked(false)

        // 2. Kalkulasi Jam Bentrok (Blok 1 jam ke depan) — selalu dalam WIB
        const blockedHours = new Set<number>()
        data.forEach(booking => {
          const bookingHour = getHourWIB(booking.booking_date)
          blockedHours.add(bookingHour)
          blockedHours.add(bookingHour + 1)
        })

        // 3. Jam Operasional (09:00 - 19:00). Max pesanan masuk jam 16:00
        const allSlots = [9, 10, 11, 12, 13, 14, 15, 16]
        const validSlots = allSlots.filter(slot => {
          // Slot valid jika jam tersebut dan 1 jam ke depannya KOSONG
          return !blockedHours.has(slot) && !blockedHours.has(slot + 1)
        })

        setAvailableTimes(validSlots.map(h => `${h.toString().padStart(2, '0')}:00`))
        setFormData(prev => ({ ...prev, reservationTime: '' })) // Reset pilihan jam

      } catch (error) {
        console.error("Gagal mengecek jadwal:", error)
      } finally {
        setIsCheckingTime(false)
      }
    }

    fetchAvailability()
  }, [selectedDate, supabase])



  const applyVehicleData = (vehicle: VehicleOption) => {
    setFormData(prev => ({
      ...prev,
      fullName: vehicle.customer_name || prev.fullName,
      year: vehicle.vehicle_year ? String(vehicle.vehicle_year) : prev.year,
      manualCarName: vehicle.vehicle_info || '',
      brand: 'OTHER',
      model: '',
      trim: '',
    }))
    setIsManualInput(true)
    setAvailableModels([])
    setAvailableTrims([])
    setAvailableYears([])
    setEmailSearchResult('found')
    setShowVehicleModal(false)
  }


  const fetchVehicleByEmail = async () => {
    const email = formData.email.trim()
    if (!email) {
      alert('Masukkan alamat email terlebih dahulu.')
      return
    }

    setIsSearchingEmail(true)
    setEmailSearchResult('idle')

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('customer_name, vehicle_info, vehicle_year')
        .eq('customer_email', email)
        .order('created_at', { ascending: false })

      if (error || !data || data.length === 0) {
        setEmailSearchResult('not_found')
        return
      }


      const seen = new Set<string>()
      const uniqueVehicles: VehicleOption[] = []
      for (const row of data) {
        const key = `${(row.vehicle_info || '').toLowerCase().trim()}|${row.vehicle_year ?? ''}`
        if (!seen.has(key)) {
          seen.add(key)
          uniqueVehicles.push({
            customer_name: row.customer_name,
            vehicle_info: row.vehicle_info,
            vehicle_year: row.vehicle_year,
          })
        }
      }

      if (uniqueVehicles.length === 1) {
        // Hanya 1 kendaraan unik → langsung auto-fill
        applyVehicleData(uniqueVehicles[0])
      } else {
        // Lebih dari 1 kendaraan unik → tampilkan popup pemilihan
        setVehicleOptions(uniqueVehicles)
        setShowVehicleModal(true)
        // Auto-fill nama pelanggan dari data terbaru
        setFormData(prev => ({ ...prev, fullName: uniqueVehicles[0].customer_name || prev.fullName }))
      }
    } catch (err) {
      console.error('Gagal mencari data pelanggan:', err)
      setEmailSearchResult('not_found')
    } finally {
      setIsSearchingEmail(false)
    }
  }

  // Handle Form Inputs
  const handleBrandChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedBrandName = e.target.value
    setAvailableModels([]); setAvailableTrims([]); setAvailableYears([])
    setFormData({ ...formData, brand: selectedBrandName, model: '', trim: '', year: '' })
    setIsManualInput(false)

    if (selectedBrandName === 'OTHER') { setIsManualInput(true); return }
    const foundBrand = carData.find(b => b.brand === selectedBrandName)
    if (foundBrand) setAvailableModels(foundBrand.models)
  }

  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedModelName = e.target.value
    setFormData({ ...formData, model: selectedModelName, trim: '', year: '' })

    const foundModel = availableModels.find(m => m.name === selectedModelName)
    if (foundModel) {
      setAvailableTrims(foundModel.variants)
      setAvailableYears(foundModel.years)
    } else {
      setAvailableTrims([]); setAvailableYears([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !formData.reservationTime) {
      alert("Pilih tanggal dan jam reservasi terlebih dahulu!")
      return
    }

    const holidayName = isPublicHoliday(selectedDate)
    if (holidayName) {
      alert(`❌ Tanggal yang dipilih adalah hari libur nasional: "${holidayName}". Silakan pilih tanggal lain.`)
      setSelectedDate('')
      setAvailableTimes([])
      setIsHolidayError(`Tanggal ini adalah hari libur nasional: "${holidayName}". Silakan pilih tanggal lain.`)
      return
    }

    setLoading(true)

    try {
      let photoUrl = null
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('service-evidence').upload(fileName, photoFile)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('service-evidence').getPublicUrl(fileName)
        photoUrl = urlData.publicUrl
      }

      const namaMobil = isManualInput
        ? formData.manualCarName
        : `${formData.brand} ${formData.model} ${formData.trim}`;

      // Menggabungkan Tanggal dan Jam
      const finalBookingDate = toWIBISOString(selectedDate, formData.reservationTime)

      const { error: bookingError } = await supabase.from('bookings').insert({
        customer_name: formData.fullName,
        customer_email: formData.email,
        customer_phone: formData.phoneNumber,
        service_type: formData.serviceType,
        vehicle_year: parseInt(formData.year),
        vehicle_info: namaMobil,
        license_plate: formData.licensePlate.toUpperCase() || null,
        problem_description: formData.description,
        photo_url: photoUrl,
        status: 'pending_approval',
        booking_date: finalBookingDate
      })

      if (bookingError) throw bookingError

      // Kirim email notifikasi ke customer
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.fullName,
          customerEmail: formData.email,
          vehicleInfo: namaMobil,
          vehicleYear: formData.year,
          serviceType: formData.serviceType,
          description: formData.description,
          bookingDate: finalBookingDate
        })
      })



      alert('✅ Booking Berhasil Dibuat! Email konfirmasi telah dikirim.')

      setFormData({ fullName: '', email: '', phoneNumber: '', description: '', year: '', model: '', trim: '', brand: '', manualCarName: '', serviceType: '', reservationTime: '', licensePlate: '' })
      setSelectedDate('')
      setPhotoFile(null)
      setIsManualInput(false)
      setEmailSearchResult('idle')

    } catch (error: any) {
      alert('❌ Terjadi Kesalahan: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 py-6 px-4 sm:py-12 md:px-8">
      {/* Modal Pemilihan Kendaraan */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-slate-700">
              <h3 className="text-lg font-bold text-yellow-500 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                Pilih Kendaraan
              </h3>
              <p className="text-sm text-slate-400 mt-1">Ditemukan {vehicleOptions.length} kendaraan terdaftar. Pilih yang ingin Anda gunakan:</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {vehicleOptions.map((v, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyVehicleData(v)}
                  className="w-full text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-yellow-500/50 rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:bg-yellow-500/20 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-200 group-hover:text-yellow-500 transition-colors truncate">
                        {v.vehicle_info || 'Kendaraan tidak diketahui'}
                      </p>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Tahun: {v.vehicle_year || '-'}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-slate-600 group-hover:text-yellow-500 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-slate-700">
              <button
                type="button"
                onClick={() => { setShowVehicleModal(false); setVehicleOptions([]) }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                Batal — Isi Manual
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-end gap-2 mb-6">
          <Link href="/check-status" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-lg shadow transition-all text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Cek Status Reparasi
          </Link>
          <Link href="/admin-login" className="bg-slate-800 hover:bg-slate-700 text-yellow-500 border border-yellow-500/50 hover:border-yellow-500 font-semibold py-2 px-4 rounded-lg shadow transition-all text-sm flex items-center gap-2">
            Login Admin
          </Link>
        </div>
        <div className="text-center mb-12">
          <div className="relative w-full max-w-[280px] sm:max-w-sm md:max-w-md mx-auto mb-4 aspect-[4/1]">
            <Image src="/scorpionlogo.png" alt="Scorpion Autoworks" fill className="object-contain" priority />
          </div>
          <p className="text-slate-400 text-lg">Formulir Reservasi Layanan Servis & Reparasi</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400">Nama Lengkap</label>
                <input type="text" required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400">Alamat Email</label>
                <div className="flex items-center gap-2">
                  <input type="email" required className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500" value={formData.email} onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setEmailSearchResult('idle') }} />
                  <button
                    type="button"
                    onClick={fetchVehicleByEmail}
                    disabled={isSearchingEmail || !formData.email.trim()}
                    className="shrink-0 bg-yellow-500/10 border border-yellow-500/50 hover:bg-yellow-500/20 hover:border-yellow-500 text-yellow-500 font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                    title="Cari data kendaraan dari booking sebelumnya"
                  >
                    {isSearchingEmail ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Mencari...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        Cari Data Saya
                      </span>
                    )}
                  </button>
                </div>
                {emailSearchResult === 'found' && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Data ditemukan! Nama & data kendaraan Anda telah diisi otomatis.
                  </p>
                )}
                {emailSearchResult === 'not_found' && (
                  <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" /></svg>
                    Tidak ada riwayat booking dengan email ini. Silakan isi data secara manual.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400">Nomor Telepon</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                  <input
                    type="tel"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-yellow-500"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="Contoh: 08123456789"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-800 my-6" />

            <h3 className="text-xl font-semibold text-yellow-500">Data Kendaraan</h3>

            {/* Input Nomor Polisi */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400">Nomor Polisi Kendaraan</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h.01M18 12h.01" /></svg>
                </div>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-yellow-500 uppercase tracking-wider"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                  placeholder="Contoh: B 1234 ABC"
                  maxLength={15}
                />
              </div>
              <p className="text-xs text-slate-500">Masukkan nomor plat kendaraan Anda untuk memudahkan pencarian riwayat servis.</p>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dropdown Mobil*/}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400">Merk Mobil</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500" onChange={handleBrandChange} value={formData.brand} required>
                  <option value="">-- Pilih Merk --</option>
                  {carData.map((b, index) => <option key={index} value={b.brand}>{b.brand}</option>)}
                  <option value="OTHER" className="text-yellow-400 font-bold">+ Merk Lainnya (Manual)</option>
                </select>
              </div>

              {isManualInput ? (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-yellow-500">Tuliskan Data Mobil (Merk, Model, Tipe)</label>
                    <input type="text" required className="w-full bg-slate-800 border border-yellow-600 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500" value={formData.manualCarName} onChange={(e) => setFormData({ ...formData, manualCarName: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-400">Tahun Produksi</label>
                    <input type="number" required min="1990" max="2026" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-400">Model</label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500" onChange={handleModelChange} value={formData.model} disabled={!formData.brand || availableModels.length === 0} required={!isManualInput}>
                      <option value="">-- Pilih Model --</option>
                      {availableModels.map((m, index) => <option key={index} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-400">Tipe / Trim</label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500" value={formData.trim} onChange={(e) => setFormData({ ...formData, trim: e.target.value })} disabled={!formData.model || availableTrims.length === 0} required={!isManualInput}>
                      <option value="">-- Pilih Tipe --</option>
                      {availableTrims.map((t, index) => <option key={index} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-400">Tahun Produksi</label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} disabled={!formData.model || availableYears.length === 0} required={!isManualInput}>
                      <option value="">-- Pilih Tahun --</option>
                      {availableYears.map((y, index) => <option key={index} value={y}>{y}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>



            <hr className="border-slate-800 my-6" />

            <h3 className="text-xl font-semibold text-yellow-500">Detail Layanan & Jadwal</h3>
            <div className="space-y-4">

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400">Pilih Jenis Layanan</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500" value={formData.serviceType} onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })} required>
                  <option value="">-- Pilih Jenis Layanan --</option>
                  <option value="General Checkup">General Checkup</option>
                  <option value="Service Rutin">Service Rutin (Ganti Oli, Tune Up, dll)</option>
                  <option value="Repair / Perbaikan">Repair / Perbaikan Komponen</option>
                  <option value="Lainnya">Lainnya / Konsultasi</option>
                </select>
              </div>

              {/* FITUR BARU: Kalender & Waktu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400">Tanggal Servis</label>
                  <input
                    type="date"
                    required
                    min={todayString || undefined}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 text-slate-200"
                    value={selectedDate}
                    onChange={(e) => {
                      const date = e.target.value
                      const holidayName = isPublicHoliday(date)
                      if (holidayName) {
                        setIsHolidayError(`Tanggal ini adalah hari libur nasional: "${holidayName}". Silakan pilih tanggal lain.`)
                        setSelectedDate('')
                        setAvailableTimes([])
                      } else {
                        setIsHolidayError(null)
                        setSelectedDate(date)
                      }
                    }}
                  />
                  {isHolidayError && (
                    <p className="text-xs text-red-400 mt-1 flex items-start gap-1.5">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      {isHolidayError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400">Jam Servis (WIB)</label>
                  {isCheckingTime ? (
                    <div className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-500">Mengecek jadwal...</div>
                  ) : isDateFullyBooked ? (
                    <div className="w-full bg-red-900/50 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                      Penuh! Maksimal 4 pesanan per hari.
                    </div>
                  ) : (
                    <select
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
                      value={formData.reservationTime}
                      onChange={(e) => setFormData({ ...formData, reservationTime: e.target.value })}
                      disabled={!selectedDate || availableTimes.length === 0}
                      required
                    >
                      <option value="">-- Pilih Jam (09:00 - 19:00) --</option>
                      {availableTimes.map((time, idx) => (
                        <option key={idx} value={time.substring(0, 5)}>{time}</option>
                      ))}
                    </select>
                  )}
                  {!isDateFullyBooked && selectedDate && availableTimes.length === 0 && !isCheckingTime && (
                    <p className="text-xs text-red-400 mt-1">Semua slot di tanggal ini sudah terisi (Bentrok jadwal 2 jam).</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-sm font-semibold text-slate-400">Jelaskan Keluhan / Detail yang Dibutuhkan</label>
                <textarea required rows={4} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-yellow-500" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400">Upload Foto Kendala (Opsional)</label>
                <input type="file" accept="image/*" onChange={(e) => { if (e.target.files) setPhotoFile(e.target.files[0]) }} className="w-full text-slate-400 bg-slate-800 border border-slate-700 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-slate-900 hover:file:bg-yellow-400 cursor-pointer" />
              </div>
            </div>

            <button type="submit" disabled={loading || isDateFullyBooked || (!formData.reservationTime && !!selectedDate)} className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-4 rounded-xl mt-8 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Sedang Memproses...' : 'Buat Reservasi Sekarang'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}