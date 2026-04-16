import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Indian Rupees (₹) with smart shorthand.
 * - < ₹1000 : exact (₹850)
 * - ₹1k–₹99,999 : standard Indian commas (₹12,450)
 * - ₹1 lakh+ : compact shorthand (₹1.24L)
 * - ₹1 crore+ : compact shorthand (₹1.2Cr)
 */
export function formatINR(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_00_00_000) {
    // ≥ 1 crore
    return `${sign}₹${(abs / 1_00_00_000).toFixed(1).replace(/\.0$/, "")}Cr`;
  } else if (abs >= 1_00_000) {
    // ≥ 1 lakh
    return `${sign}₹${(abs / 1_00_000).toFixed(2).replace(/\.?0+$/, "")}L`;
  } else {
    // Standard Indian comma grouping, no decimals
    return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
  }
}

/**
 * Full Indian-number-system format with commas, always ₹X,XX,XXX.
 * Use in detailed tables and PDF reports.
 */
export function formatINRFull(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
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

/**
 * Format a weight as "50 Quintal", "1,200 KG", or "2.5 Ton".
 * All numbers formatted with commas.
 */
export function formatWeight(weight: number, unit: string): string {
  const label = unit === "kg" ? "KG" : unit.charAt(0).toUpperCase() + unit.slice(1);
  const formatted = weight.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
  return `${formatted} ${label}`;
}

/**
 * Convert any weight unit to kg for comparison.
 */
export function convertToKg(weight: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case "quintal":
      return weight * 100;
    case "ton":
      return weight * 1000;
    case "kg":
    default:
      return weight;
  }
}
