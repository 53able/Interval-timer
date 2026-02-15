import { z } from "zod/v4";

/**
 * フェーズの種類
 *
 * - `work`: 作業フェーズ（高強度トレーニング）
 * - `rest`: 休憩フェーズ
 */
export const PhaseTypeSchema = z.enum(["work", "rest"]);

/** フェーズの種類の型 */
export type PhaseType = z.infer<typeof PhaseTypeSchema>;

/**
 * タイマーの1フェーズを表すスキーマ
 *
 * ラウンド内で繰り返されるフェーズを定義する。
 * 準備フェーズ（prepare）はPresetのトップレベルフィールドで管理し、
 * ラウンドループには含まれない。
 *
 * 例: WORK(20秒) → REST(10秒) → WORK(20秒) → REST(10秒) → ...
 */
export const PhaseSchema = z.object({
  /** フェーズの一意識別子 */
  id: z.string(),
  /** フェーズの種類 */
  type: PhaseTypeSchema,
  /** UI表示用ラベル（例: "WORK", "REST"） */
  label: z.string(),
  /** フェーズの秒数（正の整数） */
  durationSec: z.number().int().positive(),
  /** UI表示用カラーコード（例: "#4CAF50"） */
  color: z.string(),
});

/** フェーズの型 */
export type Phase = z.infer<typeof PhaseSchema>;

/**
 * プリセットを表すスキーマ
 *
 * 1つのプリセットは準備フェーズ（1回のみ）と、ラウンドで繰り返す
 * フェーズ配列（work/rest）で構成される。
 * ユーザーはプリセットを選択してタイマーを開始する。
 */
export const PresetSchema = z.object({
  /** プリセットの一意識別子（ビルトインは固定値、ユーザー作成はUUID） */
  id: z.string(),
  /** プリセット名 */
  name: z.string(),
  /** ラウンド（繰り返し）回数 */
  totalRounds: z.number().int().positive(),
  /** 準備フェーズの秒数（0 で準備フェーズを省略） */
  prepareSec: z.number().int().nonnegative(),
  /** ラウンド内で繰り返すフェーズの配列（最低1つ必要、work/rest のみ） */
  phases: z.array(PhaseSchema).min(1),
  /** 作成日時（Unixタイムスタンプ、ミリ秒）。ビルトインは 0 */
  createdAt: z.number(),
});

/** プリセットの型 */
export type Preset = z.infer<typeof PresetSchema>;
