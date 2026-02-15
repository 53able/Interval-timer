import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { type Preset, formatPhaseSummary } from "@/schemas/timer";

/** PresetCard のプロパティ型 */
type PresetCardProps = {
  /** 表示するプリセット */
  readonly preset: Preset;
  /** 「スタート」ボタン押下時のコールバック */
  readonly onStart: (presetId: string) => void;
  /** 「編集」ボタン押下時のコールバック */
  readonly onEdit: (presetId: string) => void;
  /** 「削除」ボタン押下時のコールバック */
  readonly onDelete: (presetId: string) => void;
};

/** P5モーション: ボタン共通のアニメーションクラス */
const BUTTON_MOTION =
  "transition-all duration-200 hover:scale-105 active:scale-95" as const;

/**
 * プリセットカードコンポーネント
 *
 * プリセット名、フェーズ概要、操作ボタン（スタート・編集・削除）を表示する。
 * P5テーマ: 赤みのある黒背景 + 赤ボーダー + ホバーリフト効果
 *
 * **明度による階層化**: プリセット名(明) vs 概要テキスト(暗)
 */
export const PresetCard = memo(function PresetCard({ preset, onStart, onEdit, onDelete }: PresetCardProps) {
  return (
    <Card className="border-red-900/40 bg-neutral-900 text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-red-700/60 hover:shadow-lg hover:shadow-red-950/20">
      <CardHeader>
        <CardTitle className="text-lg font-bold tracking-tight">{preset.name}</CardTitle>
        <CardDescription className="font-mono text-sm tracking-wide text-neutral-500">{formatPhaseSummary(preset)}</CardDescription>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button
          onClick={() => onStart(preset.id)}
          className={`bg-red-600 hover:bg-red-500 ${BUTTON_MOTION}`}
        >
          スタート
        </Button>
        <Button
          variant="secondary"
          onClick={() => onEdit(preset.id)}
          className={BUTTON_MOTION}
        >
          編集
        </Button>
        <Button
          variant="destructive"
          onClick={() => onDelete(preset.id)}
          className={BUTTON_MOTION}
        >
          削除
        </Button>
      </CardFooter>
    </Card>
  );
});
