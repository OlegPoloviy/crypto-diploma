export function formatNumber(value: number) {
  return new Intl.NumberFormat("uk-UA").format(value);
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
