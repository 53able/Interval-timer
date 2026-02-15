import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App.tsx";
import "./app.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * PWA Service Worker を登録する
 *
 * VitePWA の `registerType: "autoUpdate"` と組み合わせて、
 * 新しいバージョンが利用可能になったら自動的に更新する。
 */
registerSW({ immediate: true });
