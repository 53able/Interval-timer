import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePresetStore } from "@/stores/preset-store";
import { TABATA_PRESET } from "@/data/default-presets";
import type { Preset } from "@/schemas/timer";
import { EditorPage } from "./editor-page";

/**
 * usePresetStore の状態をリセットするヘルパー
 *
 * テスト間の状態漏洩を防ぐため、各テスト前に初期状態へ戻す。
 */
const resetStore = () => {
  usePresetStore.setState({ presets: [TABATA_PRESET] });
};

/** テスト用のカスタムプリセット */
const CUSTOM_PRESET: Preset = {
  id: "custom-1",
  name: "Custom Workout",
  totalRounds: 4,
  prepareSec: 0,
  phases: [
    {
      id: "custom-work",
      type: "work",
      label: "WORK",
      durationSec: 30,
      color: "#FF5722",
    },
    {
      id: "custom-rest",
      type: "rest",
      label: "REST",
      durationSec: 15,
      color: "#2196F3",
    },
  ],
  createdAt: 1700000000000,
};

describe("EditorPage", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("編集モード", () => {
    it("既存プリセットの内容が表示される", () => {
      // Arrange: ストアにカスタムプリセットを追加
      usePresetStore.getState().addPreset(CUSTOM_PRESET);

      // Act
      render(<EditorPage presetId="custom-1" onGoHome={() => {}} />);

      // Assert: プリセット名
      expect(screen.getByLabelText("プリセット名")).toHaveValue(
        "Custom Workout",
      );

      // Assert: ラウンド数
      expect(screen.getByLabelText("ラウンド数")).toHaveValue(4);

      // Assert: フェーズが2つ表示される
      const phaseItems = screen.getAllByTestId("phase-item");
      expect(phaseItems).toHaveLength(2);
    });
  });
});
