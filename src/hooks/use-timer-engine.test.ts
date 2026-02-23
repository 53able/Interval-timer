import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimerStore } from "@/stores/timer-store";
import { useTimerEngine } from "./use-timer-engine";
import type { Preset } from "@/schemas/timer";

vi.mock("@/audio/sound-engine", () => ({
  resumeAudioContext: vi.fn(() => Promise.resolve()),
}));

/** テスト用プリセット（2フェーズ × 2ラウンド、準備なし） */
const TEST_PRESET: Preset = {
  id: "test-preset",
  name: "Test",
  totalRounds: 2,
  prepareSec: 0,
  phases: [
    {
      id: "test-work",
      type: "work",
      label: "WORK",
      durationSec: 3,
      color: "#4CAF50",
    },
    {
      id: "test-rest",
      type: "rest",
      label: "REST",
      durationSec: 2,
      color: "#FFC107",
    },
  ],
  createdAt: 0,
};

/** テスト用の1秒で完了するプリセット（準備なし） */
const ONE_SEC_PRESET: Preset = {
  id: "one-sec",
  name: "OneSec",
  totalRounds: 1,
  prepareSec: 0,
  phases: [
    {
      id: "one-sec-work",
      type: "work",
      label: "WORK",
      durationSec: 1,
      color: "#4CAF50",
    },
  ],
  createdAt: 0,
};

describe("useTimerEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTimerStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    // visibilityState をデフォルトに復元
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });

  describe("タイマーループの起動・停止", () => {
    it("idle 時はタイマーループが起動しない", () => {
      // Arrange: ストアは初期状態（idle, remainingSec = 0）
      renderHook(() => useTimerEngine());

      // Act: 3秒経過させる
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Assert: remainingSec は変化しない（tick が呼ばれていない）
      expect(useTimerStore.getState().remainingSec).toBe(0);
    });

    it("running 時に1秒ごとに tick が呼ばれる", () => {
      // Arrange: タイマーを開始（remainingSec = 3）
      useTimerStore.getState().start(TEST_PRESET);
      renderHook(() => useTimerEngine());

      // Act & Assert: 1秒後に tick が1回呼ばれる
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(useTimerStore.getState().remainingSec).toBe(2);

      // Act & Assert: もう1秒後に tick がもう1回呼ばれる
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(useTimerStore.getState().remainingSec).toBe(1);
    });

    it("paused 時にタイマーループが停止する", () => {
      // Arrange: タイマーを開始して1秒進める
      useTimerStore.getState().start(TEST_PRESET);
      renderHook(() => useTimerEngine());

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(useTimerStore.getState().remainingSec).toBe(2);

      // Act: 一時停止してから3秒経過
      act(() => {
        useTimerStore.getState().pause();
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Assert: remainingSec は一時停止時のまま変化しない
      expect(useTimerStore.getState().remainingSec).toBe(2);
    });

    it("completed 時にタイマーループが停止する", () => {
      // Arrange: 1秒で完了するプリセット
      useTimerStore.getState().start(ONE_SEC_PRESET);
      renderHook(() => useTimerEngine());

      // Act: 1秒経過 → tick → completed
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(useTimerStore.getState().status).toBe("completed");

      // Assert: さらに時間が経過しても状態は変わらない
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(useTimerStore.getState().status).toBe("completed");
      expect(useTimerStore.getState().remainingSec).toBe(0);
    });
  });

  describe("クリーンアップ", () => {
    it("アンマウント時にタイマーループが停止する", () => {
      // Arrange: タイマーを開始して1秒進める
      useTimerStore.getState().start(TEST_PRESET);
      const { unmount } = renderHook(() => useTimerEngine());

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(useTimerStore.getState().remainingSec).toBe(2);

      // Act: アンマウント
      unmount();

      // Assert: これ以上 tick は呼ばれない
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(useTimerStore.getState().remainingSec).toBe(2);
    });
  });

  describe("コールバック", () => {
    it("フェーズ切り替え時に onPhaseChange が呼ばれる", () => {
      // Arrange: 最初のフェーズの残り1秒にセット
      const onPhaseChange = vi.fn();
      useTimerStore.getState().start(TEST_PRESET);
      useTimerStore.setState({ remainingSec: 1 });

      renderHook(() => useTimerEngine({ onPhaseChange }));

      // Act: 1秒経過 → フェーズ 0 → 1 に切り替わる
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Assert
      expect(onPhaseChange).toHaveBeenCalledTimes(1);
    });

    it("完了時に onComplete が呼ばれる", () => {
      // Arrange: 1秒で完了するプリセット
      const onComplete = vi.fn();
      useTimerStore.getState().start(ONE_SEC_PRESET);

      renderHook(() => useTimerEngine({ onComplete }));

      // Act: 1秒経過 → 完了
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Assert
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("フェーズが切り替わらない通常の tick では onPhaseChange が呼ばれない", () => {
      // Arrange: remainingSec = 3 なので、1秒後もまだ同じフェーズ
      const onPhaseChange = vi.fn();
      useTimerStore.getState().start(TEST_PRESET);

      renderHook(() => useTimerEngine({ onPhaseChange }));

      // Act: 1秒経過（フェーズは切り替わらない）
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Assert
      expect(onPhaseChange).not.toHaveBeenCalled();
    });
  });

  describe("visibilitychange", () => {
    it("hidden にしても interval は止まらず tick が継続する", () => {
      useTimerStore.getState().start(TEST_PRESET);
      renderHook(() => useTimerEngine());

      act(() => {
        Object.defineProperty(document, "visibilityState", {
          value: "hidden",
          configurable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(useTimerStore.getState().remainingSec).toBe(2);
    });

    it("バックグラウンドからフォアグラウンド復帰時に経過時間が補正される", () => {
      // Arrange: タイマーを開始（remainingSec = 3）
      useTimerStore.getState().start(TEST_PRESET);
      renderHook(() => useTimerEngine());

      // Act: バックグラウンドに遷移
      act(() => {
        Object.defineProperty(document, "visibilityState", {
          value: "hidden",
          configurable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      // 2秒経過（バックグラウンド中）
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // フォアグラウンドに復帰
      act(() => {
        Object.defineProperty(document, "visibilityState", {
          value: "visible",
          configurable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      // Assert: 2秒分の tick が補正される（3 - 2 = 1）
      expect(useTimerStore.getState().remainingSec).toBe(1);
    });
  });
});
