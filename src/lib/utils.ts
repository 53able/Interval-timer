import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn/ui 用のクラス名マージユーティリティ
 *
 * clsx で条件付きクラス名を結合し、tailwind-merge で
 * Tailwind CSS のクラス競合を解決する。
 *
 * @example
 * ```tsx
 * cn("px-4 py-2", isActive && "bg-blue-500", className)
 * ```
 */
export const cn = (...inputs: ReadonlyArray<ClassValue>): string => {
  return twMerge(clsx(inputs));
};
