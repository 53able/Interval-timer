import { z } from "zod/v4";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MIN_BPM, MAX_BPM } from "@/audio/metronome-engine";

/** デフォルトBPM */
const DEFAULT_BPM = 160;

/** デフォルト音量（パーセンテージ） */
const DEFAULT_VOLUME = 50;

/**
 * BPMストアの永続化データを検証するZodスキーマ
 *
 * localStorage から復元したデータが正しい構造を持つか `safeParse` で検証し、
 * 不正データ（範囲外の値を含む）の場合はデフォルト状態にフォールバックする。
 */
const BpmStoreSchema = z.object({
  /** メトロノームのBPM（140〜200） */
  bpm: z.number().min(MIN_BPM).max(MAX_BPM),
  /** メトロノームの音量（0〜100%） */
  volume: z.number().min(0).max(100),
});

/** BPMストアの状態型 */
type BpmStoreState = z.infer<typeof BpmStoreSchema>;

/** BPMストアのアクション型 */
type BpmStoreActions = {
  /** BPMを設定する（MIN_BPM〜MAX_BPMにクランプ） */
  readonly setBpm: (bpm: number) => void;
  /** 音量を設定する（0〜100にクランプ） */
  readonly setVolume: (volume: number) => void;
};

/** localStorage に保存する際のストレージキー */
const STORAGE_KEY = "interval-timer-bpm" as const;

/**
 * メトロノームのBPM・音量設定を管理するストア
 *
 * - Zustand の `persist` ミドルウェアで localStorage に永続化
 * - `merge` コールバックで Zod バリデーション（範囲外はデフォルトにフォールバック）
 * - アクション内でも値をクランプし、不正値の書き込みを防止
 *
 * **注意**: メトロノームの再生状態（isPlaying）はブラウザの自動再生制限により
 * 永続化せず、コンポーネントローカルの useState で管理する。
 */
export const useBpmStore = create<BpmStoreState & BpmStoreActions>()(
  persist(
    (set) => ({
      bpm: DEFAULT_BPM,
      volume: DEFAULT_VOLUME,

      setBpm: (bpm: number) => {
        const clamped = Math.max(MIN_BPM, Math.min(bpm, MAX_BPM));
        set({ bpm: clamped });
      },

      setVolume: (volume: number) => {
        const clamped = Math.max(0, Math.min(volume, 100));
        set({ volume: clamped });
      },
    }),
    {
      name: STORAGE_KEY,
      merge: (persisted, current) => {
        const parsed = BpmStoreSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
