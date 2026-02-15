import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTimerStore } from "@/stores/timer-store";
import { usePresetStore } from "@/stores/preset-store";
import type { Preset } from "@/schemas/timer";
import { TimerPage } from "./timer-page";

/**
 * react-spring のモック
 *
 * アニメーションはテスト困難なため、useSpring は空オブジェクトを返し、
 * animated.circle / animated.div はそれぞれネイティブ要素にフォールバックさせる。
 */
vi.mock("@react-spring/web", () => ({
  useSpring: () => ({}),
  animated: {
    circle: "circle",
    div: "div",
  },
}));

/**
 * sound-engine のモック
 *
 * Tone.js はテスト環境（jsdom）で AudioContext を扱えないため、
 * 全エクスポートを no-op 関数でモック化する。
 */
vi.mock("@/audio/sound-engine", () => ({
  initAudio: vi.fn().mockResolvedValue(undefined),
  playPrepareStart: vi.fn(),
  playPhaseStart: vi.fn(),
  playComplete: vi.fn(),
}));

/** テスト用のプリセット（準備なし） */
const TEST_PRESET: Preset = {
  id: "test-preset",
  name: "Test Workout",
  totalRounds: 3,
  prepareSec: 0,
  phases: [
    {
      id: "work",
      type: "work",
      label: "WORK",
      durationSec: 20,
      color: "#4CAF50",
    },
    {
      id: "rest",
      type: "rest",
      label: "REST",
      durationSec: 10,
      color: "#FFC107",
    },
  ],
  createdAt: 0,
};

/**
 * useTimerStore の状態をリセットするヘルパー
 *
 * テスト間の状態漏洩を防ぐため、各テスト前に初期状態へ戻す。
 */
const resetStore = () => {
  useTimerStore.setState({
    status: "idle",
    currentPhaseIndex: 0,
    currentRound: 1,
    remainingSec: 0,
    presetId: null,
    phases: [],
    totalRounds: 1,
    prepareSec: 0,
    isPreparingPhase: false,
  });
  usePresetStore.setState({ presets: [TEST_PRESET] });
};

/**
 * ストアを running 状態にセットするヘルパー
 *
 * テスト用プリセットを開始した直後の状態を再現する。
 */
const setRunningState = () => {
  useTimerStore.setState({
    status: "running",
    presetId: TEST_PRESET.id,
    currentPhaseIndex: 0,
    currentRound: 1,
    remainingSec: 18,
    phases: TEST_PRESET.phases,
    totalRounds: TEST_PRESET.totalRounds,
    prepareSec: 0,
    isPreparingPhase: false,
  });
};

/**
 * ストアを paused 状態にセットするヘルパー
 */
const setPausedState = () => {
  useTimerStore.setState({
    status: "paused",
    presetId: TEST_PRESET.id,
    currentPhaseIndex: 0,
    currentRound: 1,
    remainingSec: 15,
    phases: TEST_PRESET.phases,
    totalRounds: TEST_PRESET.totalRounds,
    prepareSec: 0,
    isPreparingPhase: false,
  });
};

/**
 * ストアを completed 状態にセットするヘルパー
 */
const setCompletedState = () => {
  useTimerStore.setState({
    status: "completed",
    presetId: TEST_PRESET.id,
    currentPhaseIndex: 1,
    currentRound: 3,
    remainingSec: 0,
    phases: TEST_PRESET.phases,
    totalRounds: TEST_PRESET.totalRounds,
    prepareSec: 0,
    isPreparingPhase: false,
  });
};

/**
 * リングボタンへのタップ（短押し）をシミュレートするヘルパー
 *
 * pointerDown → pointerUp を即座に発火してタップ操作を再現する。
 */
const tapRing = (ring: HTMLElement) => {
  fireEvent.pointerDown(ring);
  fireEvent.pointerUp(ring);
};

/**
 * リングボタンへのロングプレス（長押し）をシミュレートするヘルパー
 *
 * pointerDown → 600ms 経過 → pointerUp で長押し操作を再現する。
 * fake timers を使用するため、呼び出し前に vi.useFakeTimers() が必要。
 */
const longPressRing = (ring: HTMLElement) => {
  fireEvent.pointerDown(ring);
  act(() => {
    vi.advanceTimersByTime(600);
  });
  fireEvent.pointerUp(ring);
};

describe("TimerPage", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("残り秒数の表示", () => {
    it("現在のフェーズの残り秒数がリング中央に表示される", () => {
      // Arrange
      setRunningState();

      // Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert: SVG text 要素内に残り秒数が表示される
      expect(screen.getByText("18")).toBeInTheDocument();
    });
  });

  describe("リングのヒントテキスト表示", () => {
    it("idle状態で「TAP TO START」ヒントが表示される", () => {
      // Arrange & Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert
      expect(screen.getByText("TAP TO START")).toBeInTheDocument();
    });

    it("idle状態でリングに「タップでスタート」aria-label が設定される", () => {
      // Arrange & Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert
      expect(
        screen.getByRole("button", { name: "タップでスタート" }),
      ).toBeInTheDocument();
    });

    it("running状態で「TAP TO PAUSE」ヒントが表示される", () => {
      // Arrange
      setRunningState();

      // Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert
      expect(screen.getByText("TAP TO PAUSE")).toBeInTheDocument();
    });

    it("paused状態で「TAP / HOLD」ヒントが表示される", () => {
      // Arrange
      setPausedState();

      // Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert
      expect(screen.getByText("TAP / HOLD")).toBeInTheDocument();
    });

    it("completed状態で「TAP TO RESET」ヒントが表示される", () => {
      // Arrange
      setCompletedState();

      // Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert
      expect(screen.getByText("TAP TO RESET")).toBeInTheDocument();
    });

    it("completed状態で完了メッセージが表示される", () => {
      // Arrange
      setCompletedState();

      // Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert
      expect(screen.getByText("COMPLETE")).toBeInTheDocument();
      expect(screen.getByText("ワークアウト完了")).toBeInTheDocument();
    });
  });

  describe("リングジェスチャー操作", () => {
    it("idle状態でリングをタップするとストアがrunning状態になる", async () => {
      // Arrange
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);
      const ring = screen.getByRole("button", { name: "タップでスタート" });

      // Act
      tapRing(ring);

      // Assert: handleStart は async なので状態反映を待つ
      await vi.waitFor(() => {
        expect(useTimerStore.getState().status).toBe("running");
      });
      expect(useTimerStore.getState().presetId).toBe("test-preset");
    });

    it("running状態でリングをタップするとストアがpaused状態になる", () => {
      // Arrange
      setRunningState();
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);
      const ring = screen.getByRole("button", { name: "タップでポーズ" });

      // Act
      tapRing(ring);

      // Assert
      expect(useTimerStore.getState().status).toBe("paused");
    });

    it("paused状態でリングをタップするとストアがrunning状態になる", () => {
      // Arrange
      setPausedState();
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);
      const ring = screen.getByRole("button", {
        name: "タップで再開、長押しでリセット",
      });

      // Act
      tapRing(ring);

      // Assert
      expect(useTimerStore.getState().status).toBe("running");
    });

    it("paused状態でリングをロングプレスするとストアがidle状態になる", () => {
      // Arrange
      vi.useFakeTimers();
      setPausedState();
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);
      const ring = screen.getByRole("button", {
        name: "タップで再開、長押しでリセット",
      });

      // Act
      longPressRing(ring);

      // Assert
      expect(useTimerStore.getState().status).toBe("idle");

      // Cleanup
      vi.useRealTimers();
    });

    it("completed状態で完了画面をタップするとストアがidle状態になる", async () => {
      // Arrange
      setCompletedState();
      const user = userEvent.setup();
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);
      const resetButton = screen.getByRole("button", {
        name: "タップでリセット",
      });

      // Act
      await user.click(resetButton);

      // Assert
      expect(useTimerStore.getState().status).toBe("idle");
    });
  });

  describe("マルチリングSVG", () => {
    it("SVG circle要素（リング）が存在する", () => {
      // Arrange
      setRunningState();

      // Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert: 外側(Total) + 中間(WORK) + 内側(REST) = 3つのリング
      const circles = document.querySelectorAll("circle");
      expect(circles.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("凡例表示", () => {
    it("凡例にTotal, WORK, RESTが表示される", () => {
      // Arrange
      setRunningState();

      // Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert: 凡例とPhaseDurationStepperの両方に WORK/REST が存在する
      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getAllByText("WORK").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("REST").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("ラウンドステッパー", () => {
    it("running 状態で +/- ボタンが表示される", () => {
      // Arrange
      setRunningState();

      // Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert
      expect(
        screen.getByRole("button", { name: "セット回数を減らす" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "セット回数を増やす" }),
      ).toBeInTheDocument();
    });

    it("paused 状態で +/- ボタンが表示される", () => {
      // Arrange
      setPausedState();

      // Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert
      expect(
        screen.getByRole("button", { name: "セット回数を減らす" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "セット回数を増やす" }),
      ).toBeInTheDocument();
    });

    it("idle 状態でもステッパーが表示される", () => {
      // Arrange & Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert: スタート前でもセット回数の変更が可能
      expect(
        screen.getByRole("button", { name: "セット回数を減らす" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "セット回数を増やす" }),
      ).toBeInTheDocument();
    });

    it("completed 状態ではステッパーが表示されない", () => {
      // Arrange
      setCompletedState();

      // Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert
      expect(
        screen.queryByRole("button", { name: "セット回数を減らす" }),
      ).not.toBeInTheDocument();
    });

    it("「+」クリックでセット回数が増える", async () => {
      // Arrange
      setRunningState();
      const user = userEvent.setup();
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Act
      await user.click(
        screen.getByRole("button", { name: "セット回数を増やす" }),
      );

      // Assert
      expect(useTimerStore.getState().totalRounds).toBe(4);
    });

    it("「-」クリックでセット回数が減る", async () => {
      // Arrange
      setRunningState(); // currentRound=1, totalRounds=3
      const user = userEvent.setup();
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Act
      await user.click(
        screen.getByRole("button", { name: "セット回数を減らす" }),
      );

      // Assert
      expect(useTimerStore.getState().totalRounds).toBe(2);
    });

    it("currentRound と totalRounds が同じとき「-」は disabled", () => {
      // Arrange: ラウンド3/3 の状態
      useTimerStore.setState({
        status: "running",
        presetId: TEST_PRESET.id,
        currentPhaseIndex: 0,
        currentRound: 3,
        remainingSec: 18,
        phases: TEST_PRESET.phases,
        totalRounds: 3,
        prepareSec: 0,
        isPreparingPhase: false,
      });

      // Act
      render(<TimerPage presetId="test-preset" onSwitchPreset={() => {}} />);

      // Assert
      expect(
        screen.getByRole("button", { name: "セット回数を減らす" }),
      ).toBeDisabled();
    });
  });
});
