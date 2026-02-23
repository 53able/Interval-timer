import { z } from "zod/v4";
import {
  type Preset,
  type PhaseType,
  PhaseSchema,
  MAX_TOTAL_ROUNDS,
  MIN_PHASE_DURATION_SEC,
  MAX_PHASE_DURATION_SEC,
} from "@/schemas/timer";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * タイマーの動作状態を表すZodスキーマ
 *
 * - `idle`: 初期状態（タイマー未開始）
 * - `running`: タイマー実行中
 * - `paused`: 一時停止中
 * - `completed`: 全ラウンド完了
 */
const TimerStatusSchema = z.enum(["idle", "running", "paused", "completed"]);

/** タイマーの動作状態 */
export type TimerStatus = z.infer<typeof TimerStatusSchema>;

/**
 * タイマーストアの永続化データを検証するZodスキーマ
 *
 * localStorage から復元したデータが正しい構造を持つか `safeParse` で検証し、
 * 不正データの場合は初期状態にフォールバックする。
 */
const TimerStoreSchema = z.object({
  /** タイマーの動作状態 */
  status: TimerStatusSchema,
  /** 現在のフェーズのインデックス（0始まり、準備フェーズ中は -1） */
  currentPhaseIndex: z.number().int(),
  /** 現在のラウンド番号（1始まり） */
  currentRound: z.number().int().positive(),
  /** 現在のフェーズの残り秒数 */
  remainingSec: z.number().nonnegative(),
  /** 実行中のプリセットID。idle 時は null */
  presetId: z.string().nullable(),
  /** 実行中プリセットのフェーズ配列（start 時にコピー、work/rest のみ） */
  phases: z.array(PhaseSchema),
  /** 実行中プリセットの総ラウンド数 */
  totalRounds: z.number().int().positive(),
  /** 準備フェーズの秒数（0 は準備フェーズなし） */
  prepareSec: z.number().nonnegative(),
  /** 現在、準備フェーズを実行中かどうか */
  isPreparingPhase: z.boolean(),
});

/** タイマーストアの状態型 */
type TimerStoreState = z.infer<typeof TimerStoreSchema>;

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
   * 現在実行中のフェーズが該当タイプの場合、remainingSec を delta 分だけ追従させる
   * （延長 → remaining も増え、短縮 → remaining も減る）。
   *
   * 制約:
   * - 最小値: MIN_PHASE_DURATION_SEC（5秒）
   * - 最大値: MAX_PHASE_DURATION_SEC（300秒）
   * - running / paused 状態でのみ有効
   */
  readonly updatePhaseDuration: (phaseType: PhaseType, newDurationSec: number) => void;
  /**
   * バックグラウンド復帰時: hidden 時点のスナップショットから経過秒数分だけ状態を進め、一括反映する
   *
   * コールバック（サウンド）は発火させず、表示のずれのみ補正する。
   */
  readonly syncFromElapsed: (
    snapshot: Readonly<Pick<TimerStoreState, "remainingSec" | "currentPhaseIndex" | "currentRound" | "isPreparingPhase" | "phases" | "totalRounds" | "prepareSec">>,
    elapsedSec: number,
  ) => void;
};

/** localStorage に保存する際のストレージキー */
const STORAGE_KEY = "interval-timer-timer" as const;

/** tick 計算用のスナップショット型（syncFromElapsed の引数） */
type TickSnapshot = Pick<
  TimerStoreState,
  "remainingSec" | "currentPhaseIndex" | "currentRound" | "isPreparingPhase" | "phases" | "totalRounds" | "prepareSec"
>;

/**
 * 1秒分の経過を適用した次の状態を返す（純粋関数）
 *
 * @returns 次のスナップショット、または完了時は null
 */
const computeNextTickState = (s: Readonly<TickSnapshot>): TickSnapshot | null => {
  const nextRemaining = s.remainingSec - 1;

  if (nextRemaining > 0) {
    return { ...s, remainingSec: nextRemaining };
  }

  if (s.isPreparingPhase) {
    return {
      ...s,
      isPreparingPhase: false,
      currentPhaseIndex: 0,
      remainingSec: s.phases[0].durationSec,
    };
  }

  const isLastPhase = s.currentPhaseIndex >= s.phases.length - 1;
  const isLastRound = s.currentRound >= s.totalRounds;

  if (isLastPhase && isLastRound) return null;

  if (isLastPhase) {
    return {
      ...s,
      currentRound: s.currentRound + 1,
      currentPhaseIndex: 0,
      remainingSec: s.phases[0].durationSec,
    };
  }

  const nextPhaseIndex = s.currentPhaseIndex + 1;
  return {
    ...s,
    currentPhaseIndex: nextPhaseIndex,
    remainingSec: s.phases[nextPhaseIndex].durationSec,
  };
};

/**
 * タイマーストアの初期状態
 *
 * タイマー停止時やリセット時にこの状態に戻る。
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
 * - Zustand の `persist` ミドルウェアで localStorage に永続化
 * - `merge` コールバックで Zod バリデーション + 復元時の特殊ルール:
 *   - `status: "running"` → `"paused"` に変更（リロード後の自動再生を防止）
 * - `start` でプリセットを受け取り、フェーズ情報をストア内にコピー
 * - `tick` で毎秒の更新を処理:
 *   1. 準備フェーズ中: デクリメント → 0 になったらラウンドループ開始
 *   2. ラウンドループ: デクリメント → フェーズ進行 → ラウンド進行 → 完了
 */
export const useTimerStore = create<TimerStoreState & TimerStoreActions>()(
  persist(
    (set, get) => ({
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

        // 現在実行中のフェーズが該当タイプなら、残り秒数をdelta分だけ追従させる
        // 延長 → remainingも増える（リングが伸びる = 直感通り）
        // 短縮 → remainingも減る（リングが縮む = 直感通り）
        const currentPhase = isPreparingPhase ? null : phases[currentPhaseIndex];
        if (currentPhase?.type === phaseType) {
          const delta = clamped - currentPhase.durationSec;
          const adjustedRemaining = Math.max(0, Math.min(remainingSec + delta, clamped));
          set({ phases: updatedPhases, remainingSec: adjustedRemaining });
        } else {
          set({ phases: updatedPhases });
        }
      },

      tick: () => {
        const state = get();
        const snapshot: TickSnapshot = {
          remainingSec: state.remainingSec,
          currentPhaseIndex: state.currentPhaseIndex,
          currentRound: state.currentRound,
          isPreparingPhase: state.isPreparingPhase,
          phases: state.phases,
          totalRounds: state.totalRounds,
          prepareSec: state.prepareSec,
        };
        const next = computeNextTickState(snapshot);
        if (next) {
          set(next);
        } else {
          set({ status: "completed", remainingSec: 0 });
        }
      },

      syncFromElapsed: (snapshot, elapsedSec) => {
        if (elapsedSec <= 0) return;
        let state: TickSnapshot = {
          remainingSec: snapshot.remainingSec,
          currentPhaseIndex: snapshot.currentPhaseIndex,
          currentRound: snapshot.currentRound,
          isPreparingPhase: snapshot.isPreparingPhase,
          phases: snapshot.phases,
          totalRounds: snapshot.totalRounds,
          prepareSec: snapshot.prepareSec,
        };
        for (let i = 0; i < elapsedSec; i += 1) {
          const next = computeNextTickState(state);
          if (!next) {
            set({ ...get(), status: "completed", remainingSec: 0 });
            return;
          }
          state = next;
        }
        set({ ...get(), ...state });
      },
    }),
    {
      name: STORAGE_KEY,
      merge: (persisted, current) => {
        const parsed = TimerStoreSchema.safeParse(persisted);
        if (!parsed.success) return current;

        const data = parsed.data;
        // 復元時の特殊ルール: running → paused（リロード後にタイマーが自動で走り出すのを防止）
        const restoredStatus = data.status === "running" ? ("paused" as const) : data.status;

        return { ...current, ...data, status: restoredStatus };
      },
    },
  ),
);
