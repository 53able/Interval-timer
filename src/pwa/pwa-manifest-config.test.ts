import { describe, expect, it } from "vitest";
import { pwaManifestConfig } from "./pwa-manifest-config";

describe("PWA マニフェスト設定", () => {
  it("アプリ名・短縮名・説明文が設定されている", () => {
    expect(pwaManifestConfig.name).toBe("Interval Timer");
    expect(pwaManifestConfig.short_name).toBe("Timer");
    expect(pwaManifestConfig.description).toBe(
      "ワークアウト用インターバルタイマー",
    );
  });

  it("テーマカラーと背景色が設定されている", () => {
    expect(pwaManifestConfig.theme_color).toBe("#1a2e1a");
    expect(pwaManifestConfig.background_color).toBe("#0a0a0a");
  });

  it("スタンドアロンモードで表示される", () => {
    expect(pwaManifestConfig.display).toBe("standalone");
  });

  it("PWAアイコンが192x192と512x512で定義されている", () => {
    expect(pwaManifestConfig.icons).toEqual([
      { src: "pwa-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
      {
        src: "pwa-512x512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ]);
  });
});
