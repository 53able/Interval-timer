import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTimerStore } from "@/stores/timer-store";
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
    it("現在のフェーズの残り秒数が表示される", () => {
      // Arrange
      setRunningState();

      // Act
      render(<TimerPage presetId="test-preset" onGoHome={() => {}} />);

      // Assert
      expect(screen.getByText(/18/)).toBeInTheDocument();
    });
  });

  describe("アクションボタンの表示状態", () => {
    it("idle状態で「スタート」ボタンが表示される", () => {
      // Arrange & Act
      render(<TimerPage presetId="test-preset" onGoHome={() => {}} />);

      // Assert
      expect(
        screen.getByRole("button", { name: "スタート" }),
      ).toBeInTheDocument();
    });

    it("running状態で「ポーズ」ボタンが表示される", () => {
      // Arrange
      setRunningState();

      // Act
      render(<TimerPage presetId="test-preset" onGoHome={() => {}} />);

      // Assert
      expect(
        screen.getByRole("button", { name: "ポーズ" }),
      ).toBeInTheDocument();
    });

    it("paused状態で「再開」と「リセット」ボタンが表示される", () => {
      // Arrange
      setPausedState();

      // Act
      render(<TimerPage presetId="test-preset" onGoHome={() => {}} />);

      // Assert
      expect(
        screen.getByRole("button", { name: "再開" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "リセット" }),
      ).toBeInTheDocument();
    });

    it("completed状態で「ホームに戻る」ボタンが表示される", () => {
      // Arrange
      setCompletedState();

      // Act
      render(<TimerPage presetId="test-preset" onGoHome={() => {}} />);

      // Assert
      expect(
        screen.getByRole("button", { name: "ホームに戻る" }),
      ).toBeInTheDocument();
    });
  });

  describe("ボタン操作", () => {
    it("「スタート」クリックでストアのstartが呼ばれる", async () => {
      // Arrange
      const user = userEvent.setup();
      const startSpy = vi.spyOn(useTimerStore.getState(), "start");
      render(<TimerPage presetId="test-preset" onGoHome={() => {}} />);

      // Act
      await user.click(screen.getByRole("button", { name: "スタート" }));

      // Assert
      expect(startSpy).toHaveBeenCalled();
    });

    it("「ポーズ」クリックでストアのpauseが呼ばれる", async () => {
      // Arrange
      setRunningState();
      const user = userEvent.setup();
      const pauseSpy = vi.spyOn(useTimerStore.getState(), "pause");
      render(<TimerPage presetId="test-preset" onGoHome={() => {}} />);

      // Act
      await user.click(screen.getByRole("button", { name: "ポーズ" }));

      // Assert
      expect(pauseSpy).toHaveBeenCalled();
    });

    it("「再開」クリックでストアのresumeが呼ばれる", async () => {
      // Arrange
      setPausedState();
      const user = userEvent.setup();
      const resumeSpy = vi.spyOn(useTimerStore.getState(), "resume");
      render(<TimerPage presetId="test-preset" onGoHome={() => {}} />);

      // Act
      await user.click(screen.getByRole("button", { name: "再開" }));

      // Assert
      expect(resumeSpy).toHaveBeenCalled();
    });

    it("「リセット」クリックでストアのresetが呼ばれる", async () => {
      // Arrange
      setPausedState();
      const user = userEvent.setup();
      const resetSpy = vi.spyOn(useTimerStore.getState(), "reset");
      render(<TimerPage presetId="test-preset" onGoHome={() => {}} />);

      // Act
      await user.click(screen.getByRole("button", { name: "リセット" }));

      // Assert
      expect(resetSpy).toHaveBeenCalled();
    });

    it("「ホームに戻る」クリックでonGoHomeが呼ばれる", async () => {
      // Arrange
      setCompletedState();
      const user = userEvent.setup();
      const handleGoHome = vi.fn();
      render(<TimerPage presetId="test-preset" onGoHome={handleGoHome} />);

      // Act
      await user.click(screen.getByRole("button", { name: "ホームに戻る" }));

      // Assert
      expect(handleGoHome).toHaveBeenCalledOnce();
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
