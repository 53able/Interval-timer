import { z } from "zod/v4";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * ドロワーストアの永続化データを検証するZodスキーマ
 *
 * localStorage から復元したデータが正しい構造を持つか `safeParse` で検証し、
 * 不正データの場合はデフォルト状態（全て閉じた状態）にフォールバックする。
 */
const DrawerStoreSchema = z.object({
  /** ドロワーの開閉状態 */
  isOpen: z.boolean(),
  /** プリセット登録フォームの表示状態 */
  isRegistering: z.boolean(),
  /** 新規プリセット名の入力値 */
  newPresetName: z.string(),
});

/** ドロワーストアの状態型 */
type DrawerStoreState = z.infer<typeof DrawerStoreSchema>;

/** ドロワーストアのアクション型 */
type DrawerStoreActions = {
  /** ドロワーの開閉状態を設定する */
  readonly setIsOpen: (open: boolean) => void;
  /** 登録フォームの表示状態を設定する */
  readonly setIsRegistering: (registering: boolean) => void;
  /** 新規プリセット名を設定する */
  readonly setNewPresetName: (name: string) => void;
  /** ドロワーを閉じて登録フォームもリセットする */
  readonly closeDrawer: () => void;
};

/** localStorage に保存する際のストレージキー */
const STORAGE_KEY = "interval-timer-drawer" as const;

/**
 * プリセットドロワーのUI状態を管理するストア
 *
 * - Zustand の `persist` ミドルウェアで localStorage に永続化
 * - `merge` コールバックで Zod バリデーション
 * - `closeDrawer` アクションで3つの状態を一括リセット（アトミック更新）
 */
export const useDrawerStore = create<DrawerStoreState & DrawerStoreActions>()(
  persist(
    (set) => ({
      isOpen: false,
      isRegistering: false,
      newPresetName: "",

      setIsOpen: (open: boolean) => set({ isOpen: open }),
      setIsRegistering: (registering: boolean) => set({ isRegistering: registering }),
      setNewPresetName: (name: string) => set({ newPresetName: name }),
      closeDrawer: () => set({ isOpen: false, isRegistering: false, newPresetName: "" }),
    }),
    {
      name: STORAGE_KEY,
      merge: (persisted, current) => {
        const parsed = DrawerStoreSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
