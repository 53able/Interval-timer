import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";

/**
 * Honoアプリケーション
 *
 * 薄いミドルウェアレイヤーとして機能する:
 * - セキュリティヘッダー（CSP, HSTS, X-Frame-Options等）
 * - 将来のAPIエンドポイント拡張基盤
 *
 * 開発時: @hono/vite-dev-server 経由でミドルウェアを適用。
 *         index.html の配信は Vite が担当するため、SPAフォールバックは不要。
 * 本番時: Vercel Functions としてデプロイ。SPAフォールバックは Vercel のリライトで対応。
 */
const app = new Hono();

/** セキュリティヘッダーの一元管理 */
app.use("*", secureHeaders());

export default app;
