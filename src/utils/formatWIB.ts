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


export const formatWIBShort = (dateString: string): string => {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(dateString));
};

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

export const getHourWIB = (dateString: string): number => {
  return parseInt(
    new Intl.DateTimeFormat('id-ID', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    }).format(new Date(dateString))
  );
};

export const toWIBISOString = (date: string, time: string): string => {
  return `${date}T${time}:00+07:00`;
};

export const startOfDayWIB = (yyyy: string, mm: string, dd: string): string => {
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00+07:00`).toISOString();
};

export const endOfDayWIB = (yyyy: string, mm: string, dd: string): string => {
  return new Date(`${yyyy}-${mm}-${dd}T23:59:59.999+07:00`).toISOString();
};
