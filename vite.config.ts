import path from "node:path";
import devServer from "@hono/vite-dev-server";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Vite 設定
 *
 * - React: JSX変換 + Fast Refresh
 * - Tailwind CSS v4: Viteプラグインで統合
 * - Hono dev server: `/api/*` ルートのみHonoに委譲。
 *   セキュリティヘッダー等のミドルウェアはAPIレスポンスに適用される。
 *   SPAのindex.html配信はViteが担当。
 *   本番環境（Vercel）では全リクエストがHonoを経由する。
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devServer({
      entry: "server/index.ts",
      exclude: [
        /** `/api/` 以外の全パスをViteに委譲 */
        /^(?!\/api\/)/,
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
