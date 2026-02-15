import type { Preset } from "@/schemas/timer";

/**
 * タバタプロトコル デフォルトプリセット
 *
 * 田畑泉博士による高強度インターバルトレーニング:
 * - 準備10秒（1回のみ） + 20秒の全力運動 + 10秒の休憩 × 8セット
 * - 合計4分10秒（準備10秒 + (20秒+10秒) × 8ラウンド）
 *
 * アプリ初回起動時に提供され、ユーザーはすぐにタイマーを開始できる。
 * `id` が固定値であり、ビルトインプリセットとユーザー作成プリセットを区別する。
 */
export const TABATA_PRESET: Preset = {
  id: "default-tabata",
  name: "Tabata",
  totalRounds: 8,
  prepareSec: 10,
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
