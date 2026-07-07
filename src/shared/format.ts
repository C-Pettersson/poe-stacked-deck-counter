export function formatChaos(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  if (Math.abs(value) >= 1000) {
    return `${compactNumber(value)}c`;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2).replace(/\.0$/, "")}c`;
}

export function formatSignedChaos(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatChaos(value)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatDateRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();

  if (sameDay) {
    const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(start);
    const startTime = new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(start);
    const endTime = new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(end);
    return `${date}, ${startTime} - ${endTime}`;
  }

  return `${formatDateTime(startAt)} - ${formatDateTime(endAt)}`;
}

function compactNumber(value: number): string {
  return Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}
