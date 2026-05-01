/**
 * Format timestamp for chart display
 */
export function formatChartTime(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}${ampm}`;
}

/**
 * Format timestamp for tooltip (more detailed)
 */
export function formatTooltipTime(timestamp: string): string {
  const date = new Date(timestamp);
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const time = formatChartTime(timestamp);
  return `${dayName}, ${monthDay} at ${time}`;
}

/**
 * Get color based on score value (0-100)
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "hsl(120, 70%, 50%)"; // Green - excellent
  if (score >= 60) return "hsl(80, 70%, 50%)"; // Yellow-green - good
  if (score >= 40) return "hsl(45, 70%, 50%)"; // Yellow - fair
  if (score >= 20) return "hsl(25, 70%, 50%)"; // Orange - poor
  return "hsl(0, 70%, 50%)"; // Red - very poor
}

/**
 * Get score description text
 */
export function getScoreDescription(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Very Good";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 25) return "Poor";
  return "Very Poor";
}

/**
 * Format date for day separator labels
 */
export function formatDayLabel(timestamp: string): string {
  const date = new Date(timestamp);
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${dayName} ${monthDay}`;
}

/**
 * Format timestamp for x-axis labels (shows day name only)
 */
export function formatXAxisLabel(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * Get midnight 5 days from a given date
 */
export function getMidnightFiveDaysLater(fromDate: Date): Date {
  const target = new Date(fromDate);
  target.setDate(target.getDate() + 5);
  target.setHours(23, 59, 59, 999);
  return target;
}
