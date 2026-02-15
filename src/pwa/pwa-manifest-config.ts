import type { ManifestOptions } from "vite-plugin-pwa";

/**
 * PWA Web App Manifest 設定
 *
 * アプリ名、アイコン、テーマカラー、表示モードなど、
 * PWAとしてインストールされる際のメタデータを定義する。
 *
 * @see https://developer.mozilla.org/ja/docs/Web/Manifest
 */
export const pwaManifestConfig: Partial<ManifestOptions> = {
  name: "Interval Timer",
  short_name: "Timer",
  description: "ワークアウト用インターバルタイマー",
  theme_color: "#1a2e1a",
  background_color: "#0a0a0a",
  display: "standalone",
  icons: [
    { src: "pwa-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
    {
      src: "pwa-512x512.svg",
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "any maskable",
    },
  ],
};
