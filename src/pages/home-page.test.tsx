import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePresetStore } from "@/stores/preset-store";
import { TABATA_PRESET } from "@/data/default-presets";
import type { Preset } from "@/schemas/timer";
import { HomePage } from "./home-page";

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

describe("HomePage", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("プリセット一覧表示", () => {
    it("デフォルトのTABATAプリセットが表示される", () => {
      // Arrange & Act
      render(
        <HomePage
          onStartTimer={() => {}}
          onEditPreset={() => {}}
        />,
      );

      // Assert
      expect(screen.getByText("Tabata")).toBeInTheDocument();
    });

    it("複数のプリセットが一覧表示される", () => {
      // Arrange
      usePresetStore.getState().addPreset(CUSTOM_PRESET);

      // Act
      render(
        <HomePage
          onStartTimer={() => {}}
          onEditPreset={() => {}}
        />,
      );

      // Assert
      expect(screen.getByText("Tabata")).toBeInTheDocument();
      expect(screen.getByText("Custom Workout")).toBeInTheDocument();
    });

    it("フェーズ概要が表示される", () => {
      // Arrange & Act
      render(
        <HomePage
          onStartTimer={() => {}}
          onEditPreset={() => {}}
        />,
      );

      // Assert: TABATAは "20s WORK / 10s REST × 8"
      expect(screen.getByText("20s WORK / 10s REST × 8")).toBeInTheDocument();
    });
  });

  describe("カードのボタン", () => {
    it("各カードに「スタート」ボタンが存在する", () => {
      // Arrange & Act
      render(
        <HomePage
          onStartTimer={() => {}}
          onEditPreset={() => {}}
        />,
      );

      // Assert
      expect(
        screen.getByRole("button", { name: "スタート" }),
      ).toBeInTheDocument();
    });

    it("各カードに「編集」ボタンが存在する", () => {
      // Arrange & Act
      render(
        <HomePage
          onStartTimer={() => {}}
          onEditPreset={() => {}}
        />,
      );

      // Assert
      expect(
        screen.getByRole("button", { name: "編集" }),
      ).toBeInTheDocument();
    });

    it("各カードに「削除」ボタンが存在する", () => {
      // Arrange & Act
      render(
        <HomePage
          onStartTimer={() => {}}
          onEditPreset={() => {}}
        />,
      );

      // Assert
      expect(
        screen.getByRole("button", { name: "削除" }),
      ).toBeInTheDocument();
    });
  });

  describe("ユーザー操作", () => {
    it("「スタート」クリックでonStartTimerがプリセットIDで呼ばれる", async () => {
      // Arrange
      const user = userEvent.setup();
      const handleStartTimer = vi.fn();
      render(
        <HomePage
          onStartTimer={handleStartTimer}
          onEditPreset={() => {}}
        />,
      );

      // Act
      await user.click(screen.getByRole("button", { name: "スタート" }));

      // Assert
      expect(handleStartTimer).toHaveBeenCalledWith("default-tabata");
    });

    it("「編集」クリックでonEditPresetがプリセットIDで呼ばれる", async () => {
      // Arrange
      const user = userEvent.setup();
      const handleEditPreset = vi.fn();
      render(
        <HomePage
          onStartTimer={() => {}}
          onEditPreset={handleEditPreset}
        />,
      );

      // Act
      await user.click(screen.getByRole("button", { name: "編集" }));

      // Assert
      expect(handleEditPreset).toHaveBeenCalledWith("default-tabata");
    });

    it("「削除」クリックでプリセットがストアから削除される", async () => {
      // Arrange
      const user = userEvent.setup();
      usePresetStore.getState().addPreset(CUSTOM_PRESET);
      render(
        <HomePage
          onStartTimer={() => {}}
          onEditPreset={() => {}}
        />,
      );

      // Act: Custom Workoutの削除ボタンをクリック
      const deleteButtons = screen.getAllByRole("button", { name: "削除" });
      await user.click(deleteButtons[1]); // 2番目のカードの削除ボタン

      // Assert
      expect(usePresetStore.getState().presets).toHaveLength(1);
      expect(usePresetStore.getState().presets[0].id).toBe("default-tabata");
    });
  });
});
