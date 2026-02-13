import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function nowIso() {
  return new Date().toISOString();
}

export function sanitizeText(input: string) {
  return input.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}
