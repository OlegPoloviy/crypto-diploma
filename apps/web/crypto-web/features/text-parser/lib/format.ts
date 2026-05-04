export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
