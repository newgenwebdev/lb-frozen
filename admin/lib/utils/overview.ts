import { AVATAR_COLORS } from "../constants";

export function getComparisonText(period: string): string {
  switch (period) {
    case "yesterday":
      return "vs day before";
    case "7days":
      return "vs previous week";
    case "month":
      return "vs last month";
    case "year":
      return "vs last year";
    case "today":
    default:
      return "vs yesterday";
  }
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function getAvatarColorClass(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function getPeriodLabel(dateFilter: string): string {
  switch (dateFilter) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "7days":
      return "7 Days";
    case "month":
      return "Month";
    case "year":
      return "Year";
    default:
      return dateFilter;
  }
}
