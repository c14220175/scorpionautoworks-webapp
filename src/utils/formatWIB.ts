/**
 * Format tanggal dari database ke tampilan WIB (Asia/Jakarta).
 * Selalu dikunci ke timezone Jakarta agar tidak terpengaruh timezone browser/server.
 */
export const formatWIB = (dateString: string): string => {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(dateString));
};

/**
 * Format tanggal singkat DD/MM/YYYY — selalu WIB.
 */
export const formatWIBShort = (dateString: string): string => {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(dateString));
};

/**
 * Format tanggal lengkap dengan hari — selalu WIB.
 */
export const formatWIBFull = (dateString: string): string => {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(dateString));
};

/**
 * Ambil jam (number) dari string tanggal — selalu dalam WIB.
 * Digunakan untuk kalkulasi slot waktu yang tersedia.
 */
export const getHourWIB = (dateString: string): number => {
  return parseInt(
    new Intl.DateTimeFormat('id-ID', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    }).format(new Date(dateString))
  );
};

/**
 * Buat ISO string dari tanggal dan jam WIB.
 * Format: "YYYY-MM-DDTHH:mm:ss+07:00"
 * TIDAK menggunakan .toISOString() agar tidak ada silent conversion ke UTC.
 */
export const toWIBISOString = (date: string, time: string): string => {
  return `${date}T${time}:00+07:00`;
};

/**
 * Buat batas awal hari (00:00:00) dalam format ISO WIB.
 */
export const startOfDayWIB = (yyyy: string, mm: string, dd: string): string => {
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00+07:00`).toISOString();
};

/**
 * Buat batas akhir hari (23:59:59) dalam format ISO WIB.
 */
export const endOfDayWIB = (yyyy: string, mm: string, dd: string): string => {
  return new Date(`${yyyy}-${mm}-${dd}T23:59:59.999+07:00`).toISOString();
};
