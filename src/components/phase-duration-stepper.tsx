import { useCallback, memo } from "react";
import type { PhaseType } from "@/schemas/timer";
import { useAppStore } from "@/stores/app-store";

/**
 * スケール定義
 *
 * 短い時間帯と長い時間帯を分割して、各レンジで精密な調整を可能にする。
 * - ページ0: 5〜60秒（1秒刻み）→ 短いインターバルの微調整
 * - ページ1: 60〜300秒（1秒刻み）→ 長いインターバルの調整
 */
const SCALES = [
  { min: 5, max: 60, step: 1, label: "Short" },
  { min: 60, max: 300, step: 1, label: "Long" },
] as const;

/** スケールの型 */
type Scale = (typeof SCALES)[number];

/** フェーズ秒数の下限値 */
const MIN_DURATION_SEC = 5;

/** フェーズごとの表示設定 */
const PHASE_CONFIG = {
  work: { label: "WORK", colorClass: "text-red-400/80" },
  rest: { label: "REST", colorClass: "text-amber-400/80" },
} as const;

/** 値をスケール範囲にクランプしてステップに丸める */
const clampToScale = (value: number, scale: Scale): number => {
  const clamped = Math.max(scale.min, Math.min(value, scale.max));
  return Math.round(clamped / scale.step) * scale.step;
};

/** PhaseScaleSlider のプロパティ型 */
type PhaseScaleSliderProps = {
  /** フェーズの種類 */
  readonly phaseType: PhaseType;
  /** 現在の秒数 */
  readonly durationSec: number;
  /** フェーズ秒数変更コールバック */
  readonly onChangeDuration: (
    phaseType: PhaseType,
    newDurationSec: number,
  ) => void;
};

/**
 * タブでスケール切替可能なフェーズ秒数スライダー
 *
 * 短い時間帯（5-60s）と長い時間帯（60-300s）の2スケールを
 * Short / Long タブで切り替えて、各レンジで精密な調整を可能にする。
 *
 * **エラー防止**: スワイプではなくタブ切替にすることで、
 * スライダー操作との水平ジェスチャー競合を構造的に排除する。
 */
const PhaseScaleSlider = ({
  phaseType,
  durationSec,
  onChangeDuration,
}: PhaseScaleSliderProps) => {
  const scaleIndex = useAppStore((s) =>
    phaseType === "work" ? s.workScaleIndex : s.restScaleIndex,
  );
  const setStoreScaleIndex = useAppStore((s) => s.setScaleIndex);

  const config = PHASE_CONFIG[phaseType];

  /** スケールを切り替えて、値をクランプする */
  const switchScale = useCallback(
    (newIndex: number) => {
      if (newIndex === scaleIndex || newIndex < 0 || newIndex >= SCALES.length)
        return;
      setStoreScaleIndex(phaseType, newIndex);
      const clamped = clampToScale(durationSec, SCALES[newIndex]);
      if (clamped !== durationSec) {
        onChangeDuration(phaseType, clamped);
      }
    },
    [scaleIndex, durationSec, onChangeDuration, phaseType, setStoreScaleIndex],
  );

  return (
    <div className="flex flex-col gap-1">
      {/* ヘッダー: ラベル + スケールタブ + 現在値 */}
      <div className="flex items-center justify-between py-1">
        <span className={`text-xs tracking-wide ${config.colorClass}`}>
          {config.label}
        </span>
        <div className="flex items-center gap-2">
          {/* Short / Long スケールタブ */}
          <div className="flex gap-0.5 rounded-md bg-neutral-800/60 p-0.5" role="tablist" aria-label="スケール切替">
            {SCALES.map((scale, i) => (
              <button
                key={scale.min}
                type="button"
                role="tab"
                aria-selected={i === scaleIndex}
                aria-label={`${scale.label}（${scale.min}〜${scale.max}秒）`}
                onClick={() => switchScale(i)}
                className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wide transition-all duration-200 ${
                  i === scaleIndex
                    ? "bg-neutral-700 text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {scale.label}
              </button>
            ))}
          </div>
          <span className="font-mono text-sm font-bold text-white">
            {durationSec}
            <span className="text-xs font-normal text-neutral-500">s</span>
          </span>
        </div>
      </div>

      {/* スライダーカルーセル（py-3 でthumbのクリップを防止） */}
      <div className="overflow-hidden py-3">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${scaleIndex * 100}%)` }}
        >
          {SCALES.map((scale) => (
            <div key={scale.min} className="w-full shrink-0 px-1">
              <input
                type="range"
                min={scale.min}
                max={scale.max}
                step={scale.step}
                value={clampToScale(durationSec, scale)}
                onChange={(e) =>
                  onChangeDuration(phaseType, Number(e.target.value))
                }
                className={`phase-slider phase-slider-${phaseType}`}
                aria-label={`${config.label}秒数（${scale.min}〜${scale.max}秒）`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* スケール端ラベル */}
      <div className="flex justify-between px-1.5">
        <span className="text-[10px] text-neutral-600">
          {SCALES[scaleIndex].min}s
        </span>
        <span className="text-[10px] text-neutral-600">
          {SCALES[scaleIndex].max}s
        </span>
      </div>
    </div>
  );
};

/** PhaseDurationStepper のプロパティ型 */
type PhaseDurationStepperProps = {
  /** 実行中プリセットのフェーズ配列 */
  readonly phases: ReadonlyArray<{
    readonly type: PhaseType;
    readonly durationSec: number;
  }>;
  /** フェーズ秒数変更コールバック */
  readonly onChangeDuration: (
    phaseType: PhaseType,
    newDurationSec: number,
  ) => void;
};

/**
 * フェーズ秒数をリアルタイムで変更するスケールタブ付きスライダーコンポーネント
 *
 * 各フェーズ（WORK / REST）ごとに、短い時間帯（5-60s）と長い時間帯（60-300s）の
 * 2スケールを Short / Long タブで切り替えて精密な調整を可能にする。
 *
 * **UXベストプラクティス**:
 * - エラー防止: タブ切替によりスライダーとのジェスチャー競合をゼロに
 * - フィードバック: タブの選択状態 + スケール端ラベルで状態を即座表示
 * - 発見可能性: Short / Long ラベルで操作方法が明白
 * - 制約: ステップスナップで意図しない値を防止
 */
export const PhaseDurationStepper = memo(function PhaseDurationStepper({
  phases,
  onChangeDuration,
}: PhaseDurationStepperProps) {
  /** 指定タイプのフェーズの現在の秒数を取得する */
  const getDuration = (phaseType: PhaseType): number =>
    phases.find((p) => p.type === phaseType)?.durationSec ?? MIN_DURATION_SEC;

  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <PhaseScaleSlider
        phaseType="work"
        durationSec={getDuration("work")}
        onChangeDuration={onChangeDuration}
      />
      <PhaseScaleSlider
        phaseType="rest"
        durationSec={getDuration("rest")}
        onChangeDuration={onChangeDuration}
      />
    </div>
  );
});
