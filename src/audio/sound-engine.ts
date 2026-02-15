import type { PhaseType } from "@/schemas/timer";
import * as Tone from "tone";

/**
 * ノート間の時間間隔（秒）
 *
 * フレーズ内の各音の発音タイミングを等間隔に配置する。
 * 150ms はメロディとして認識しやすく、かつ速すぎない間隔。
 */
const NOTE_INTERVAL_SEC = 0.15;

/**
 * 準備フェーズの通知フレーズ
 *
 * 短いベル音（単音）で準備開始を知らせる。
 */
const PREPARE_PHRASE: readonly string[] = ["C5"];

/**
 * 各フェーズの通知フレーズ定義
 *
 * Design Docs の「通知音の設計方針」に基づくノート配列。
 * tonal のダイアトニックスケール理論に準拠した Cメジャースケール内のノートで構成。
 *
 * | フェーズ   | サウンドデザイン       | ノート                |
 * |-----------|---------------------|---------------------|
 * | work      | 上昇フレーズ（3音）    | C4→E4→G4（Cメジャー） |
 * | rest      | 下降フレーズ（2音）    | G4→C4               |
 */
const PHASE_PHRASES: Record<PhaseType, readonly string[]> = {
  work: ["C4", "E4", "G4"],
  rest: ["G4", "C4"],
} as const;

/**
 * 全ラウンド完了ファンファーレ
 *
 * C4→E4→G4→C5 のアルペジオで達成感を演出する。
 */
const COMPLETE_PHRASE: readonly string[] = ["C4", "E4", "G4", "C5"];

/** シンセサイザーインスタンス（モジュール読み込み時に1度だけ生成） */
const synth = new Tone.Synth().toDestination();

/**
 * ノート配列を等間隔で再生する
 *
 * @param notes - 再生するノート名の配列（例: ["C4", "E4", "G4"]）
 */
const playSequence = (notes: readonly string[]) => {
  const now = Tone.now();
  notes.forEach((note, index) => {
    synth.triggerAttackRelease(note, "8n", now + index * NOTE_INTERVAL_SEC);
  });
};

/**
 * AudioContext を初期化する
 *
 * ブラウザのオートプレイポリシーにより、ユーザー操作を起点として
 * AudioContext を resume する必要がある。タイマー開始ボタン押下時に呼ぶ。
 */
export const initAudio = async () => {
  await Tone.start();
};

/**
 * 準備フェーズ開始時の通知音を再生する
 *
 * C5 の短いベル音を鳴らし、ワークアウトの準備開始を知らせる。
 */
export const playPrepareStart = () => {
  playSequence(PREPARE_PHRASE);
};

/**
 * ラウンド内フェーズ開始時の通知音を再生する
 *
 * @param phaseType - 開始するフェーズの種類（"work" | "rest"）
 */
export const playPhaseStart = (phaseType: PhaseType) => {
  playSequence(PHASE_PHRASES[phaseType]);
};

/**
 * 全ラウンド完了時のファンファーレを再生する
 *
 * C メジャーアルペジオ（C4→E4→G4→C5）で達成感を演出する。
 */
export const playComplete = () => {
  playSequence(COMPLETE_PHRASE);
};
