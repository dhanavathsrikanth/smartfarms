import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Indian Rupees (₹).
 * Uses the en-IN locale for proper Indian comma grouping (1,23,456).
 * Values ≥ 1 lakh are shown in compact form (e.g. ₹1.2L) to save space.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    notation: Math.abs(amount) >= 100_000 ? "compact" : "standard",
  }).format(amount);
}

/**
 * Format an area as "5.5 Acres", "2.3 Hectares", or "3 Bigha".
 * Removes trailing zeros and capitalises the unit label.
 */
export function formatArea(area: number, unit: string): string {
  const label = unit.charAt(0).toUpperCase() + unit.slice(1);
  // Show up to 2 decimal places, strip trailing zeros
  const formatted = parseFloat(area.toFixed(2)).toString();
  return `${formatted} ${label}`;
}
