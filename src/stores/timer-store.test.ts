import { describe, it, expect, beforeEach } from "vitest";
import type { Preset } from "@/schemas/timer";
import { useTimerStore } from "./timer-store";

/** テスト用の最小プリセット（2フェーズ × 2ラウンド、準備なし） */
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

/** テスト用の1フェーズ × 1ラウンドプリセット（準備なし） */
const SINGLE_PHASE_PRESET: Preset = {
  id: "single-phase",
  name: "Single",
  totalRounds: 1,
  prepareSec: 0,
  phases: [
    {
      id: "single-work",
      type: "work",
      label: "WORK",
      durationSec: 2,
      color: "#4CAF50",
    },
  ],
  createdAt: 0,
};

/** テスト用の準備フェーズ付きプリセット（2フェーズ × 2ラウンド） */
const PREPARE_PRESET: Preset = {
  id: "prepare-preset",
  name: "WithPrepare",
  totalRounds: 2,
  prepareSec: 3,
  phases: [
    {
      id: "prep-work",
      type: "work",
      label: "WORK",
      durationSec: 2,
      color: "#4CAF50",
    },
    {
      id: "prep-rest",
      type: "rest",
      label: "REST",
      durationSec: 1,
      color: "#FFC107",
    },
  ],
  createdAt: 0,
};

/**
 * useTimerStore の初期状態リセット用ヘルパー
 */
const resetStore = () => {
  useTimerStore.getState().reset();
};

describe("useTimerStore", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("初期状態", () => {
    it("status が idle である", () => {
      const { status } = useTimerStore.getState();
      expect(status).toBe("idle");
    });

    it("currentPhaseIndex が 0 である", () => {
      const { currentPhaseIndex } = useTimerStore.getState();
      expect(currentPhaseIndex).toBe(0);
    });

    it("currentRound が 1 である", () => {
      const { currentRound } = useTimerStore.getState();
      expect(currentRound).toBe(1);
    });

    it("remainingSec が 0 である", () => {
      const { remainingSec } = useTimerStore.getState();
      expect(remainingSec).toBe(0);
    });

    it("presetId が null である", () => {
      const { presetId } = useTimerStore.getState();
      expect(presetId).toBeNull();
    });

    it("isPreparingPhase が false である", () => {
      const { isPreparingPhase } = useTimerStore.getState();
      expect(isPreparingPhase).toBe(false);
    });
  });

  describe("start", () => {
    it("status が running になる", () => {
      // Act
      useTimerStore.getState().start(TEST_PRESET);

      // Assert
      expect(useTimerStore.getState().status).toBe("running");
    });

    it("presetId にプリセットIDがセットされる", () => {
      // Act
      useTimerStore.getState().start(TEST_PRESET);

      // Assert
      expect(useTimerStore.getState().presetId).toBe("test-preset");
    });

    it("prepareSec が 0 のとき、最初のフェーズから開始する", () => {
      // Act
      useTimerStore.getState().start(TEST_PRESET);

      // Assert
      const state = useTimerStore.getState();
      expect(state.isPreparingPhase).toBe(false);
      expect(state.currentPhaseIndex).toBe(0);
      expect(state.remainingSec).toBe(3); // work の durationSec
    });

    it("prepareSec > 0 のとき、準備フェーズから開始する", () => {
      // Act
      useTimerStore.getState().start(PREPARE_PRESET);

      // Assert
      const state = useTimerStore.getState();
      expect(state.isPreparingPhase).toBe(true);
      expect(state.currentPhaseIndex).toBe(-1);
      expect(state.remainingSec).toBe(3); // prepareSec
    });

    it("currentRound が 1 にリセットされる", () => {
      // Act
      useTimerStore.getState().start(TEST_PRESET);

      // Assert
      expect(useTimerStore.getState().currentRound).toBe(1);
    });
  });

  describe("pause", () => {
    it("running から paused に遷移する", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);

      // Act
      useTimerStore.getState().pause();

      // Assert
      expect(useTimerStore.getState().status).toBe("paused");
    });
  });

  describe("resume", () => {
    it("paused から running に復帰する", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);
      useTimerStore.getState().pause();

      // Act
      useTimerStore.getState().resume();

      // Assert
      expect(useTimerStore.getState().status).toBe("running");
    });
  });

  describe("reset", () => {
    it("すべての状態が初期値に戻る", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);

      // Act
      useTimerStore.getState().reset();

      // Assert
      const state = useTimerStore.getState();
      expect(state.status).toBe("idle");
      expect(state.currentPhaseIndex).toBe(0);
      expect(state.currentRound).toBe(1);
      expect(state.remainingSec).toBe(0);
      expect(state.presetId).toBeNull();
      expect(state.isPreparingPhase).toBe(false);
    });
  });

  describe("tick", () => {
    it("remainingSec が 1 デクリメントされる", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);

      // Act
      useTimerStore.getState().tick();

      // Assert
      expect(useTimerStore.getState().remainingSec).toBe(2);
    });

    it("remainingSec が 0 になると次のフェーズに進む", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);
      // remainingSec を 1 にして tick で 0 にする
      useTimerStore.setState({ remainingSec: 1 });

      // Act
      useTimerStore.getState().tick();

      // Assert
      expect(useTimerStore.getState().currentPhaseIndex).toBe(1);
      expect(useTimerStore.getState().remainingSec).toBe(2); // rest の durationSec
    });

    it("最終フェーズが終わると次のラウンドに進む（rest → work 直接遷移）", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);
      // ラウンド1の最終フェーズ (index=1, rest) の最後の1秒
      useTimerStore.setState({
        currentPhaseIndex: 1,
        remainingSec: 1,
        currentRound: 1,
      });

      // Act
      useTimerStore.getState().tick();

      // Assert: rest → work に直接遷移（prepare を挟まない）
      expect(useTimerStore.getState().currentRound).toBe(2);
      expect(useTimerStore.getState().currentPhaseIndex).toBe(0);
      expect(useTimerStore.getState().remainingSec).toBe(3); // work の durationSec
    });

    it("全ラウンド完了で completed になる", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);
      // 最終ラウンドの最終フェーズの最後の1秒
      useTimerStore.setState({
        currentPhaseIndex: 1,
        remainingSec: 1,
        currentRound: 2,
      });

      // Act
      useTimerStore.getState().tick();

      // Assert
      expect(useTimerStore.getState().status).toBe("completed");
    });

    it("1フェーズ1ラウンドのプリセットで正しく completed になる", () => {
      // Arrange
      useTimerStore.getState().start(SINGLE_PHASE_PRESET);
      useTimerStore.setState({ remainingSec: 1 });

      // Act
      useTimerStore.getState().tick();

      // Assert
      expect(useTimerStore.getState().status).toBe("completed");
    });
  });

  describe("準備フェーズ付き tick", () => {
    it("準備フェーズ中の tick で remainingSec がデクリメントされる", () => {
      // Arrange
      useTimerStore.getState().start(PREPARE_PRESET);

      // Act
      useTimerStore.getState().tick();

      // Assert
      const state = useTimerStore.getState();
      expect(state.isPreparingPhase).toBe(true);
      expect(state.remainingSec).toBe(2);
    });

    it("準備フェーズ完了後にラウンドループの最初のフェーズに遷移する", () => {
      // Arrange
      useTimerStore.getState().start(PREPARE_PRESET);
      // 準備の残り1秒
      useTimerStore.setState({ remainingSec: 1 });

      // Act
      useTimerStore.getState().tick();

      // Assert: 準備完了 → phases[0] (work) に遷移
      const state = useTimerStore.getState();
      expect(state.isPreparingPhase).toBe(false);
      expect(state.currentPhaseIndex).toBe(0);
      expect(state.remainingSec).toBe(2); // work の durationSec
      expect(state.currentRound).toBe(1);
    });

    it("準備フェーズは最初の1回のみ。次のラウンドでは実行されない", () => {
      // Arrange: 準備付きプリセットで開始、準備を完了させる
      useTimerStore.getState().start(PREPARE_PRESET);
      useTimerStore.setState({ remainingSec: 1 });
      useTimerStore.getState().tick(); // 準備完了 → work

      // ラウンド1の全フェーズを消化: work(2s) → rest(1s)
      useTimerStore.setState({
        currentPhaseIndex: 1,
        remainingSec: 1,
        currentRound: 1,
      });
      useTimerStore.getState().tick(); // rest 完了 → 次のラウンド

      // Assert: ラウンド2は work から開始（prepare を挟まない）
      const state = useTimerStore.getState();
      expect(state.isPreparingPhase).toBe(false);
      expect(state.currentRound).toBe(2);
      expect(state.currentPhaseIndex).toBe(0); // work
      expect(state.remainingSec).toBe(2); // work の durationSec
    });

    it("準備フェーズ中でも updateTotalRounds でセット回数を変更できる", () => {
      // Arrange
      useTimerStore.getState().start(PREPARE_PRESET);

      // Act
      useTimerStore.getState().updateTotalRounds(5);

      // Assert
      expect(useTimerStore.getState().totalRounds).toBe(5);
    });

    it("準備フェーズ付きプリセットの全フロー完走", () => {
      // Arrange: prepareSec=3, work=2, rest=1, 2ラウンド
      useTimerStore.getState().start(PREPARE_PRESET);

      // 準備フェーズ: 3 → 2 → 1 → 0（完了）
      useTimerStore.getState().tick(); // 2
      useTimerStore.getState().tick(); // 1
      useTimerStore.getState().tick(); // → work phase

      // ラウンド1: work(2) → rest(1)
      expect(useTimerStore.getState().isPreparingPhase).toBe(false);
      expect(useTimerStore.getState().currentPhaseIndex).toBe(0);
      useTimerStore.getState().tick(); // work: 1
      useTimerStore.getState().tick(); // → rest
      expect(useTimerStore.getState().currentPhaseIndex).toBe(1);
      useTimerStore.getState().tick(); // → ラウンド2

      // ラウンド2: work(2) → rest(1)
      expect(useTimerStore.getState().currentRound).toBe(2);
      expect(useTimerStore.getState().currentPhaseIndex).toBe(0); // work（prepare なし）
      useTimerStore.getState().tick(); // work: 1
      useTimerStore.getState().tick(); // → rest
      useTimerStore.getState().tick(); // → completed

      // Assert
      expect(useTimerStore.getState().status).toBe("completed");
    });
  });

  describe("updateTotalRounds", () => {
    it("running 状態でセット回数を増やせる", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);

      // Act
      useTimerStore.getState().updateTotalRounds(5);

      // Assert
      expect(useTimerStore.getState().totalRounds).toBe(5);
    });

    it("paused 状態でセット回数を変更できる", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);
      useTimerStore.getState().pause();

      // Act
      useTimerStore.getState().updateTotalRounds(4);

      // Assert
      expect(useTimerStore.getState().totalRounds).toBe(4);
    });

    it("idle 状態では変更が無視される", () => {
      // Arrange: 初期状態（idle）

      // Act
      useTimerStore.getState().updateTotalRounds(10);

      // Assert: totalRounds は初期値のまま
      expect(useTimerStore.getState().totalRounds).toBe(1);
    });

    it("completed 状態では変更が無視される", () => {
      // Arrange
      useTimerStore.getState().start(SINGLE_PHASE_PRESET);
      useTimerStore.setState({ remainingSec: 1 });
      useTimerStore.getState().tick(); // → completed

      // Act
      useTimerStore.getState().updateTotalRounds(10);

      // Assert
      expect(useTimerStore.getState().totalRounds).toBe(1);
    });

    it("現在のラウンド番号より小さい値はクランプされる", () => {
      // Arrange: ラウンド3まで進行
      useTimerStore.getState().start(TEST_PRESET);
      useTimerStore.setState({ currentRound: 3, totalRounds: 5 });

      // Act: ラウンド2に設定しようとする
      useTimerStore.getState().updateTotalRounds(2);

      // Assert: currentRound(3) にクランプされる
      expect(useTimerStore.getState().totalRounds).toBe(3);
    });

    it("現在のラウンドと同じ値に設定できる（残り0ラウンド）", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);
      useTimerStore.setState({ currentRound: 2 });

      // Act
      useTimerStore.getState().updateTotalRounds(2);

      // Assert
      expect(useTimerStore.getState().totalRounds).toBe(2);
    });

    it("上限値（99）を超える値はクランプされる", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);

      // Act
      useTimerStore.getState().updateTotalRounds(100);

      // Assert
      expect(useTimerStore.getState().totalRounds).toBe(99);
    });

    it("セット回数変更後に tick で正しく完了する", () => {
      // Arrange: 2ラウンドプリセットを開始し、3ラウンドに変更
      useTimerStore.getState().start(TEST_PRESET);
      useTimerStore.getState().updateTotalRounds(3);

      // ラウンド3の最終フェーズ最後の1秒までスキップ
      useTimerStore.setState({
        currentPhaseIndex: 1,
        remainingSec: 1,
        currentRound: 3,
      });

      // Act
      useTimerStore.getState().tick();

      // Assert
      expect(useTimerStore.getState().status).toBe("completed");
    });
  });

  describe("updatePhaseDuration", () => {
    it("WORKフェーズの秒数を変更できる", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);

      // Act
      useTimerStore.getState().updatePhaseDuration("work", 30);

      // Assert
      const workPhases = useTimerStore.getState().phases.filter((p) => p.type === "work");
      expect(workPhases.every((p) => p.durationSec === 30)).toBe(true);
    });

    it("RESTフェーズの秒数を変更できる", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);

      // Act
      useTimerStore.getState().updatePhaseDuration("rest", 15);

      // Assert
      const restPhases = useTimerStore.getState().phases.filter((p) => p.type === "rest");
      expect(restPhases.every((p) => p.durationSec === 15)).toBe(true);
    });

    it("他タイプのフェーズは変更されない", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);

      // Act: WORKだけ変更
      useTimerStore.getState().updatePhaseDuration("work", 30);

      // Assert: RESTは元の2秒のまま（TEST_PRESETのREST durationSec）
      const restPhases = useTimerStore.getState().phases.filter((p) => p.type === "rest");
      expect(restPhases.every((p) => p.durationSec === 2)).toBe(true);
    });

    it("下限値（5秒）未満はクランプされる", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);

      // Act
      useTimerStore.getState().updatePhaseDuration("work", 2);

      // Assert
      const workPhases = useTimerStore.getState().phases.filter((p) => p.type === "work");
      expect(workPhases.every((p) => p.durationSec === 5)).toBe(true);
    });

    it("上限値（300秒）超はクランプされる", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);

      // Act
      useTimerStore.getState().updatePhaseDuration("work", 999);

      // Assert
      const workPhases = useTimerStore.getState().phases.filter((p) => p.type === "work");
      expect(workPhases.every((p) => p.durationSec === 300)).toBe(true);
    });

    it("延長時に残り秒数もdelta分だけ増える", () => {
      // Arrange: WORKフェーズ実行中（duration=3, 残り2秒 = 1秒経過）
      useTimerStore.getState().start(TEST_PRESET);
      useTimerStore.setState({ currentPhaseIndex: 0, remainingSec: 2 });

      // Act: WORKを10秒に延長（delta = 10 - 3 = +7）
      useTimerStore.getState().updatePhaseDuration("work", 10);

      // Assert: 残り秒数がdelta分増える（2 + 7 = 9）
      expect(useTimerStore.getState().remainingSec).toBe(9);
    });

    it("短縮時に残り秒数もdelta分だけ減る", () => {
      // Arrange: WORKフェーズ実行中（duration=30, 残り25秒）
      useTimerStore.getState().start(TEST_PRESET);
      useTimerStore.setState({
        currentPhaseIndex: 0,
        remainingSec: 25,
        phases: TEST_PRESET.phases.map((p) =>
          p.type === "work" ? { ...p, durationSec: 30 } : p,
        ),
      });

      // Act: WORKを20秒に短縮（delta = 20 - 30 = -10）
      useTimerStore.getState().updatePhaseDuration("work", 20);

      // Assert: 残り秒数がdelta分減る（25 + (-10) = 15）
      expect(useTimerStore.getState().remainingSec).toBe(15);
    });

    it("delta調整後の値が新秒数を超えたら新秒数にクランプされる", () => {
      // Arrange: WORKフェーズ実行中（残り18秒、duration=3）
      useTimerStore.getState().start(TEST_PRESET);
      useTimerStore.setState({ currentPhaseIndex: 0, remainingSec: 18 });

      // Act: WORKを15秒に変更（delta = +12、18+12=30 > 15）
      useTimerStore.getState().updatePhaseDuration("work", 15);

      // Assert: 新秒数の15にクランプ
      expect(useTimerStore.getState().remainingSec).toBe(15);
    });

    it("delta調整後の値が0未満になったら0にクランプされる", () => {
      // Arrange: WORKフェーズ実行中（duration=30に上書き、残り2秒）
      useTimerStore.getState().start(TEST_PRESET);
      useTimerStore.setState({
        currentPhaseIndex: 0,
        remainingSec: 2,
        phases: TEST_PRESET.phases.map((p) =>
          p.type === "work" ? { ...p, durationSec: 30 } : p,
        ),
      });

      // Act: WORKを5秒に短縮（delta = 5 - 30 = -25、2 + (-25) = -23）
      useTimerStore.getState().updatePhaseDuration("work", 5);

      // Assert: 0にクランプ
      expect(useTimerStore.getState().remainingSec).toBe(0);
    });

    it("idle状態では変更が無視される", () => {
      // Arrange: idle状態

      // Act
      useTimerStore.getState().updatePhaseDuration("work", 30);

      // Assert: phasesは空のまま
      expect(useTimerStore.getState().phases).toHaveLength(0);
    });

    it("paused状態でも変更できる", () => {
      // Arrange
      useTimerStore.getState().start(TEST_PRESET);
      useTimerStore.getState().pause();

      // Act
      useTimerStore.getState().updatePhaseDuration("work", 30);

      // Assert
      const workPhases = useTimerStore.getState().phases.filter((p) => p.type === "work");
      expect(workPhases.every((p) => p.durationSec === 30)).toBe(true);
    });
  });
});
