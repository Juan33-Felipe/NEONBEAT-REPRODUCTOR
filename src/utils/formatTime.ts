export function formatTime(seconds: number | undefined): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}