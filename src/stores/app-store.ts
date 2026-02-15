import { z } from "zod/v4";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { usePresetStore } from "./preset-store";
import {
  type PhaseType,
  PhaseSchema,
  MAX_TOTAL_ROUNDS,
  MIN_PHASE_DURATION_SEC,
  MAX_PHASE_DURATION_SEC,
} from "@/schemas/timer";

/**
 * フェーズ秒数から初期スケールインデックスを導出する
 *
 * 60秒以下なら Short（0）、60秒超なら Long（1）を返す。
 */
const resolveScaleIndex = (durationSec: number): number => (durationSec > 60 ? 1 : 0);

/**
 * アプリストアの永続化データを検証するZodスキーマ
 *
 * localStorage から復元したデータが正しい構造を持つか `safeParse` で検証し、
 * 不正データの場合はデフォルト状態にフォールバックする。
 * 復元時、参照先プリセットが削除済みの場合もフォールバックする。
 */
const AppStoreSchema = z.object({
  /** 現在選択中のプリセットID */
  currentPresetId: z.string(),
  /** idle 時のフェーズ編集値（ステッパーで変更済みの可能性あり） */
  idlePhases: z.array(PhaseSchema),
  /** idle 時のラウンド数編集値 */
  idleTotalRounds: z.number().int().positive().max(MAX_TOTAL_ROUNDS),
  /** WORK フェーズのスケール選択（0: Short, 1: Long） */
  workScaleIndex: z.number().int().min(0).max(1),
  /** REST フェーズのスケール選択（0: Short, 1: Long） */
  restScaleIndex: z.number().int().min(0).max(1),
});

/** アプリストアの状態型 */
type AppStoreState = z.infer<typeof AppStoreSchema>;

/** アプリストアのアクション型 */
type AppStoreActions = {
  /**
   * 選択中のプリセットIDを変更する
   *
   * プリセット切替時、idlePhases / idleTotalRounds / scaleIndex を
   * 新しいプリセットのデフォルト値にリセットする。
   */
  readonly setCurrentPresetId: (id: string) => void;
  /** idle 時のラウンド数を更新する（1〜MAX_TOTAL_ROUNDS にクランプ） */
  readonly updateIdleTotalRounds: (newTotalRounds: number) => void;
  /**
   * idle 時の指定タイプのフェーズ秒数を更新する
   *
   * 同タイプの全フェーズの durationSec を一括更新する。
   * MIN_PHASE_DURATION_SEC〜MAX_PHASE_DURATION_SEC にクランプ。
   */
  readonly updateIdlePhaseDuration: (phaseType: PhaseType, newDurationSec: number) => void;
  /** 指定フェーズタイプのスケールインデックスを設定する（0: Short, 1: Long） */
  readonly setScaleIndex: (phaseType: PhaseType, index: number) => void;
};

/** localStorage に保存する際のストレージキー */
const STORAGE_KEY = "interval-timer-app" as const;

/**
 * 初期状態を決定する
 *
 * プリセットストアの最初のプリセットからデフォルト値を取得する。
 * プリセットが存在しない場合はフォールバック値を返す（通常は到達しない）。
 */
const resolveInitialState = (): AppStoreState => {
  const firstPreset = usePresetStore.getState().presets[0];
  const phases = firstPreset?.phases ?? [];
  const workDuration = phases.find((p) => p.type === "work")?.durationSec ?? MIN_PHASE_DURATION_SEC;
  const restDuration = phases.find((p) => p.type === "rest")?.durationSec ?? MIN_PHASE_DURATION_SEC;
  return {
    currentPresetId: firstPreset?.id ?? "",
    idlePhases: phases,
    idleTotalRounds: firstPreset?.totalRounds ?? 1,
    workScaleIndex: resolveScaleIndex(workDuration),
    restScaleIndex: resolveScaleIndex(restDuration),
  };
};

/**
 * アプリケーションの画面状態を管理するストア
 *
 * - Zustand の `persist` ミドルウェアで localStorage に永続化
 * - `merge` コールバックで Zod バリデーション + プリセット存在チェック
 * - 参照先プリセットが削除済みの場合はデフォルト（先頭プリセット）にフォールバック
 *
 * 管理する状態:
 * - currentPresetId: 選択中のプリセット
 * - idlePhases / idleTotalRounds: idle 時にステッパーで編集した値
 * - workScaleIndex / restScaleIndex: Short/Long スケールタブの選択状態
 */
export const useAppStore = create<AppStoreState & AppStoreActions>()(
  persist(
    (set, get) => ({
      ...resolveInitialState(),

      setCurrentPresetId: (id: string) => {
        const preset = usePresetStore.getState().presets.find((p) => p.id === id);
        const phases = preset?.phases ?? [];
        const workDuration = phases.find((p) => p.type === "work")?.durationSec ?? MIN_PHASE_DURATION_SEC;
        const restDuration = phases.find((p) => p.type === "rest")?.durationSec ?? MIN_PHASE_DURATION_SEC;
        set({
          currentPresetId: id,
          idlePhases: phases,
          idleTotalRounds: preset?.totalRounds ?? 1,
          workScaleIndex: resolveScaleIndex(workDuration),
          restScaleIndex: resolveScaleIndex(restDuration),
        });
      },

      updateIdleTotalRounds: (newTotalRounds: number) => {
        const clamped = Math.max(1, Math.min(newTotalRounds, MAX_TOTAL_ROUNDS));
        set({ idleTotalRounds: clamped });
      },

      updateIdlePhaseDuration: (phaseType: PhaseType, newDurationSec: number) => {
        const clamped = Math.max(MIN_PHASE_DURATION_SEC, Math.min(newDurationSec, MAX_PHASE_DURATION_SEC));
        const { idlePhases } = get();
        set({
          idlePhases: idlePhases.map((p) =>
            p.type === phaseType ? { ...p, durationSec: clamped } : p,
          ),
        });
      },

      setScaleIndex: (phaseType: PhaseType, index: number) => {
        if (phaseType === "work") {
          set({ workScaleIndex: index });
        } else {
          set({ restScaleIndex: index });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      merge: (persisted, current) => {
        const parsed = AppStoreSchema.safeParse(persisted);
        if (!parsed.success) return current;

        // 復元されたプリセットIDがまだ存在するか確認
        const presets = usePresetStore.getState().presets;
        const exists = presets.some((p) => p.id === parsed.data.currentPresetId);
        return exists ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
