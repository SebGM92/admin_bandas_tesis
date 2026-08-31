// BandAdmin — helpers de formato para Chile.
// Usar SIEMPRE estos en vez de interpolar números o fechas a mano.

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

type FechaValue = string | number | Date | null | undefined;

/** 159990 -> "$159.990" */
export function formatCLP(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return "—";
  return CLP.format(Number(amount));
}

/** "2026-05-18" -> "18 may 2026" */
export function formatDate(value: FechaValue): string {
  const d = toDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** "2026-05-23T13:00" -> "sábado 23 de mayo" (para encabezados de grupo) */
export function formatDayHeading(value: FechaValue): string {
  const d = toDate(value);
  if (!d) return "—";
  const s = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "2026-05-23T13:00" -> "13:00" */
export function formatTime(value: FechaValue): string {
  const d = toDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** Rango de ensayo -> "13:00 – 15:00" */
export function formatTimeRange(start: FechaValue, end: FechaValue): string {
  if (!end) return formatTime(start);
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** Distancia en días: "en 3 días", "hoy", "hace 2 días" */
export function relativeDays(value: FechaValue, now: Date = new Date()): string {
  const d = toDate(value);
  if (!d) return "";
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round((startOf(d).getTime() - startOf(now).getTime()) / 86400000);
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days === -1) return "ayer";
  return new Intl.RelativeTimeFormat("es-CL", { numeric: "auto" }).format(days, "day");
}

/** "GUITARRA_VOZ" -> "Guitarra y voz" */
export function formatEnum(value: string | null | undefined): string {
  if (!value) return "—";
  const text = String(value).toLowerCase().replace(/_/g, " ").replace(/\bvoz\b/, "voz");
  const withAnd = text.replace(/ voz$/, " y voz");
  return withAnd.charAt(0).toUpperCase() + withAnd.slice(1);
}

export interface DiaAgrupado<T> {
  key: string;
  date: Date;
  heading: string;
  items: T[];
}

/** Agrupa una lista por día. Devuelve [{ key, heading, items }] ordenado. */
export function groupByDay<T>(items: T[], getDate: (item: T) => FechaValue): DiaAgrupado<T>[] {
  const map = new Map<string, DiaAgrupado<T>>();
  for (const item of items) {
    const d = toDate(getDate(item));
    if (!d) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) map.set(key, { key, date: d, heading: formatDayHeading(d), items: [] });
    map.get(key)!.items.push(item);
  }
  return [...map.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

function toDate(value: FechaValue): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
