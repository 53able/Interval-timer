import type { Preset, PhaseType } from "@/schemas/timer";
import { create } from "zustand";

/**
 * タイマーの動作状態
 *
 * - `idle`: 初期状態（タイマー未開始）
 * - `running`: タイマー実行中
 * - `paused`: 一時停止中
 * - `completed`: 全ラウンド完了
 */
export type TimerStatus = "idle" | "running" | "paused" | "completed";

/** タイマーストアの状態型 */
type TimerStoreState = {
  /** タイマーの動作状態 */
  readonly status: TimerStatus;
  /** 現在のフェーズのインデックス（0始まり、準備フェーズ中は -1） */
  readonly currentPhaseIndex: number;
  /** 現在のラウンド番号（1始まり） */
  readonly currentRound: number;
  /** 現在のフェーズの残り秒数 */
  readonly remainingSec: number;
  /** 実行中のプリセットID。idle 時は null */
  readonly presetId: string | null;
  /** 実行中プリセットのフェーズ配列（start 時にコピー、work/rest のみ） */
  readonly phases: Preset["phases"];
  /** 実行中プリセットの総ラウンド数 */
  readonly totalRounds: number;
  /** 準備フェーズの秒数（0 は準備フェーズなし） */
  readonly prepareSec: number;
  /** 現在、準備フェーズを実行中かどうか */
  readonly isPreparingPhase: boolean;
};

/** セット回数の上限値 */
const MAX_TOTAL_ROUNDS = 99;

/** フェーズ秒数の下限値 */
const MIN_PHASE_DURATION_SEC = 5;

/** フェーズ秒数の上限値 */
const MAX_PHASE_DURATION_SEC = 300;

/** タイマーストアのアクション型 */
type TimerStoreActions = {
  /** プリセットを指定してタイマーを開始する（idle → running） */
  readonly start: (preset: Preset) => void;
  /** タイマーを一時停止する（running → paused） */
  readonly pause: () => void;
  /** タイマーを再開する（paused → running） */
  readonly resume: () => void;
  /** タイマーをリセットして初期状態に戻す（→ idle） */
  readonly reset: () => void;
  /** 1秒経過の更新。remainingSec をデクリメントし、必要に応じてフェーズ・ラウンドを進行する */
  readonly tick: () => void;
  /**
   * セット回数（totalRounds）をリアルタイムで更新する
   *
   * 制約:
   * - 最小値: 現在のラウンド番号（既に通過したラウンドより小さくできない）
   * - 最大値: MAX_TOTAL_ROUNDS（99）
   * - running / paused 状態でのみ有効
   */
  readonly updateTotalRounds: (newTotalRounds: number) => void;
  /**
   * 指定タイプのフェーズ秒数をリアルタイムで更新する
   *
   * 同タイプの全フェーズの durationSec を一括更新する。
   * 現在実行中のフェーズが該当タイプの場合、remainingSec を新秒数以下にキャップする。
   *
   * 制約:
   * - 最小値: MIN_PHASE_DURATION_SEC（5秒）
   * - 最大値: MAX_PHASE_DURATION_SEC（300秒）
   * - running / paused 状態でのみ有効
   */
  readonly updatePhaseDuration: (phaseType: PhaseType, newDurationSec: number) => void;
};

/**
 * タイマーストアの初期状態
 *
 * タイマー停止時やリセット時にこの状態に戻る。
 * 揮発性のためlocalStorage永続化は行わない。
 */
const INITIAL_STATE: TimerStoreState = {
  status: "idle",
  currentPhaseIndex: 0,
  currentRound: 1,
  remainingSec: 0,
  presetId: null,
  phases: [],
  totalRounds: 1,
  prepareSec: 0,
  isPreparingPhase: false,
};

/**
 * タイマーの実行状態を管理するストア
 *
 * - 揮発性（localStorage 永続化なし）
 * - `start` でプリセットを受け取り、フェーズ情報をストア内にコピー
 * - `tick` で毎秒の更新を処理:
 *   1. 準備フェーズ中: デクリメント → 0 になったらラウンドループ開始
 *   2. ラウンドループ: デクリメント → フェーズ進行 → ラウンド進行 → 完了
 */
export const useTimerStore = create<TimerStoreState & TimerStoreActions>()((set, get) => ({
  ...INITIAL_STATE,

  start: (preset) => {
    const hasPrepare = preset.prepareSec > 0;
    set({
      status: "running",
      presetId: preset.id,
      phases: preset.phases,
      totalRounds: preset.totalRounds,
      prepareSec: preset.prepareSec,
      isPreparingPhase: hasPrepare,
      currentPhaseIndex: hasPrepare ? -1 : 0,
      currentRound: 1,
      remainingSec: hasPrepare ? preset.prepareSec : preset.phases[0].durationSec,
    });
  },

  pause: () => set({ status: "paused" }),

  resume: () => set({ status: "running" }),

  reset: () => set(INITIAL_STATE),

  updateTotalRounds: (newTotalRounds) => {
    const { status, currentRound } = get();
    if (status !== "running" && status !== "paused") return;

    const clamped = Math.max(currentRound, Math.min(newTotalRounds, MAX_TOTAL_ROUNDS));
    set({ totalRounds: clamped });
  },

  updatePhaseDuration: (phaseType, newDurationSec) => {
    const { status, phases, currentPhaseIndex, isPreparingPhase, remainingSec } = get();
    if (status !== "running" && status !== "paused") return;

    const clamped = Math.max(MIN_PHASE_DURATION_SEC, Math.min(newDurationSec, MAX_PHASE_DURATION_SEC));

    const updatedPhases = phases.map((p) =>
      p.type === phaseType ? { ...p, durationSec: clamped } : p,
    );

    // 現在実行中のフェーズが該当タイプなら、残り秒数を新秒数以下にキャップ
    const currentPhase = isPreparingPhase ? null : phases[currentPhaseIndex];
    const shouldCapRemaining = currentPhase?.type === phaseType && remainingSec > clamped;

    set({
      phases: updatedPhases,
      ...(shouldCapRemaining ? { remainingSec: clamped } : {}),
    });
  },

  tick: () => {
    const { remainingSec, currentPhaseIndex, currentRound, phases, totalRounds, isPreparingPhase } =
      get();
    const nextRemaining = remainingSec - 1;

    // フェーズ途中: 残り秒数をデクリメントするだけ
    if (nextRemaining > 0) {
      set({ remainingSec: nextRemaining });
      return;
    }

    // 準備フェーズ完了 → ラウンドループの最初のフェーズへ
    if (isPreparingPhase) {
      set({
        isPreparingPhase: false,
        currentPhaseIndex: 0,
        remainingSec: phases[0].durationSec,
      });
      return;
    }

    // フェーズ終了: 次の遷移先を判定
    const isLastPhase = currentPhaseIndex >= phases.length - 1;
    const isLastRound = currentRound >= totalRounds;

    // 全ラウンド完了
    if (isLastPhase && isLastRound) {
      set({ status: "completed", remainingSec: 0 });
      return;
    }

    // 次のラウンドへ（現在のラウンドの最終フェーズが終了）
    if (isLastPhase) {
      set({
        currentRound: currentRound + 1,
        currentPhaseIndex: 0,
        remainingSec: phases[0].durationSec,
      });
      return;
    }

    // 次のフェーズへ
    const nextPhaseIndex = currentPhaseIndex + 1;
    set({
      currentPhaseIndex: nextPhaseIndex,
      remainingSec: phases[nextPhaseIndex].durationSec,
    });
  },
}));
