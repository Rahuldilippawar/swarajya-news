const TIME_ZONE = "Asia/Kolkata";

/** "१७ ऑक्टो, २०२६, ११:३५ AM" style, always in Indian time regardless of where the server runs. */
export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat("mr-IN", { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE }).format(new Date(isoDate));
}

export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("mr-IN", { dateStyle: "medium", timeZone: TIME_ZONE }).format(new Date(isoDate));
}

/** Marathi relative time for cards: "५ मिनिटांपूर्वी", "३ तासांपूर्वी"; older items show the date. */
export function timeAgo(isoDate: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(isoDate).getTime()) / 60_000);
  const n = (v: number) => new Intl.NumberFormat("mr-IN").format(v);
  if (minutes < 1) return "आत्ताच";
  if (minutes < 60) return `${n(minutes)} मिनिटांपूर्वी`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${n(hours)} तासांपूर्वी`;
  return formatDate(isoDate);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("mr-IN").format(value);
}
