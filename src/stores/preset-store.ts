import { z } from "zod/v4";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PresetSchema } from "@/schemas/timer";
import type { Preset } from "@/schemas/timer";
import { TABATA_PRESET } from "@/data/default-presets";

/**
 * プリセットストアの永続化データを検証するZodスキーマ
 *
 * localStorage から復元したデータが正しい構造を持つか `safeParse` で検証し、
 * 不正データの場合はデフォルト状態（TABATA_PRESET のみ）にフォールバックする。
 */
const PresetStoreSchema = z.object({
  presets: z.array(PresetSchema),
});

/** プリセットストアの状態型 */
type PresetStoreState = z.infer<typeof PresetStoreSchema>;

/** プリセットストアのアクション型 */
type PresetStoreActions = {
  /** プリセットを末尾に追加する */
  readonly addPreset: (preset: Preset) => void;
  /** 指定IDのプリセットを削除する。該当IDが存在しない場合は何もしない */
  readonly removePreset: (id: string) => void;
};

/** localStorage に保存する際のストレージキー */
const STORAGE_KEY = "interval-timer-presets" as const;

/**
 * プリセットの一覧管理・CRUD操作を行うストア
 *
 * - Zustand の `persist` ミドルウェアで localStorage に永続化
 * - `merge` コールバックで Zod バリデーションを挟み、不正データをフォールバック
 * - 初期状態は TABATA_PRESET のみ
 */
export const usePresetStore = create<PresetStoreState & PresetStoreActions>()(
  persist(
    (set) => ({
      presets: [TABATA_PRESET],
      addPreset: (preset) =>
        set((state) => ({ presets: [...state.presets, preset] })),
      removePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        })),
    }),
    {
      name: STORAGE_KEY,
      merge: (persisted, current) => {
        const parsed = PresetStoreSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
