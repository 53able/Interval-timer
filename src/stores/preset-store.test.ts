import { describe, it, expect, beforeEach } from "vitest";
import type { Preset } from "@/schemas/timer";
import { TABATA_PRESET } from "@/data/default-presets";
import { usePresetStore } from "./preset-store";

/**
 * usePresetStore の初期状態リセット用ヘルパー
 *
 * Zustand ストアはモジュールスコープでシングルトンのため、
 * テスト間の状態漏洩を防ぐために毎テスト前にリセットする。
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

describe("usePresetStore", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("初期状態", () => {
    it("デフォルトでTABATA_PRESETが含まれている", () => {
      // Arrange & Act
      const { presets } = usePresetStore.getState();

      // Assert
      expect(presets).toHaveLength(1);
      expect(presets[0]).toEqual(TABATA_PRESET);
    });
  });

  describe("addPreset", () => {
    it("新しいプリセットを追加できる", () => {
      // Arrange
      const { addPreset } = usePresetStore.getState();

      // Act
      addPreset(CUSTOM_PRESET);

      // Assert
      const { presets } = usePresetStore.getState();
      expect(presets).toHaveLength(2);
      expect(presets[1]).toEqual(CUSTOM_PRESET);
    });

    it("既存のプリセットを保持したまま追加される", () => {
      // Arrange
      const { addPreset } = usePresetStore.getState();

      // Act
      addPreset(CUSTOM_PRESET);

      // Assert
      const { presets } = usePresetStore.getState();
      expect(presets[0]).toEqual(TABATA_PRESET);
    });
  });

  describe("removePreset", () => {
    it("指定IDのプリセットを削除できる", () => {
      // Arrange
      const store = usePresetStore.getState();
      store.addPreset(CUSTOM_PRESET);

      // Act
      usePresetStore.getState().removePreset("custom-1");

      // Assert
      const { presets } = usePresetStore.getState();
      expect(presets).toHaveLength(1);
      expect(presets[0]).toEqual(TABATA_PRESET);
    });

    it("存在しないIDで削除しても既存データに影響しない", () => {
      // Arrange & Act
      usePresetStore.getState().removePreset("non-existent-id");

      // Assert
      const { presets } = usePresetStore.getState();
      expect(presets).toHaveLength(1);
      expect(presets[0]).toEqual(TABATA_PRESET);
    });
  });
});
