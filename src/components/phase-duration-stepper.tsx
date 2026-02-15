import { useState, useRef, useCallback } from "react";
import type { PhaseType } from "@/schemas/timer";

/**
 * スケール定義
 *
 * 短い時間帯と長い時間帯を分割して、各レンジで精密な調整を可能にする。
 * - ページ0: 5〜60秒（5秒刻み）→ 短いインターバルの微調整
 * - ページ1: 60〜300秒（10秒刻み）→ 長いインターバルの調整
 */
const SCALES = [
  { min: 5, max: 60, step: 1 },
  { min: 60, max: 300, step: 1 },
] as const;

/** スケールの型 */
type Scale = (typeof SCALES)[number];

/** スワイプ判定の最小移動量（px） */
const SWIPE_THRESHOLD_PX = 30;

/** フェーズ秒数の下限値 */
const MIN_DURATION_SEC = 5;

/** フェーズごとの表示設定 */
const PHASE_CONFIG = {
  work: { label: "WORK", colorClass: "text-red-400/80" },
  rest: { label: "REST", colorClass: "text-amber-400/80" },
} as const;

/** 値が属する初期スケールインデックスを返す */
const getInitialScaleIndex = (sec: number): number => (sec > 60 ? 1 : 0);

/** 値をスケール範囲にクランプしてステップに丸める */
const clampToScale = (value: number, scale: Scale): number => {
  const clamped = Math.max(scale.min, Math.min(value, scale.max));
  return Math.round(clamped / scale.step) * scale.step;
};

/** PhaseSwipeSlider のプロパティ型 */
type PhaseSwipeSliderProps = {
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
 * スワイプ / タップでスケール切替可能なフェーズ秒数スライダー
 *
 * 短い時間帯（5-60s）と長い時間帯（60-300s）の2スケールを切り替えて、
 * 各レンジで精密な調整を可能にする。
 *
 * **切替操作**:
 * - スライダー以外のエリア（ラベル行・スケール表示行）で横スワイプ
 * - ドットインジケーターをタップ
 *
 * ※ input[type=range] の上では水平スワイプとスライダー操作が物理的に競合するため、
 *   スライダー操作を優先し、スワイプはスライダー外のエリアで検知する。
 */
const PhaseSwipeSlider = ({
  phaseType,
  durationSec,
  onChangeDuration,
}: PhaseSwipeSliderProps) => {
  const [scaleIndex, setScaleIndex] = useState(() =>
    getInitialScaleIndex(durationSec),
  );
  const touchStartXRef = useRef(0);

  const config = PHASE_CONFIG[phaseType];

  /** スケールを切り替えて、値をクランプする */
  const switchScale = useCallback(
    (newIndex: number) => {
      if (newIndex === scaleIndex || newIndex < 0 || newIndex >= SCALES.length)
        return;
      setScaleIndex(newIndex);
      const clamped = clampToScale(durationSec, SCALES[newIndex]);
      if (clamped !== durationSec) {
        onChangeDuration(phaseType, clamped);
      }
    },
    [scaleIndex, durationSec, onChangeDuration, phaseType],
  );

  /** タッチ開始位置を記録 */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  }, []);

  /** タッチ終了時にスワイプ判定してスケール切替 */
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;

      // 左スワイプ → 次のスケール、右スワイプ → 前のスケール
      const nextIndex =
        deltaX < 0
          ? Math.min(scaleIndex + 1, SCALES.length - 1)
          : Math.max(scaleIndex - 1, 0);

      switchScale(nextIndex);
    },
    [scaleIndex, switchScale],
  );

  return (
    <div
      className="flex flex-col gap-1"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ヘッダー: ラベル + タップ可能インジケーター + 現在値 */}
      <div className="flex items-center justify-between py-1">
        <span className={`text-xs tracking-wide ${config.colorClass}`}>
          {config.label}
        </span>
        <div className="flex items-center gap-2">
          {/* タップ可能なスケールインジケーター */}
          <div className="flex gap-0.5" role="tablist" aria-label="スケール切替">
            {SCALES.map((scale, i) => (
              <button
                key={scale.min}
                type="button"
                role="tab"
                aria-selected={i === scaleIndex}
                aria-label={`${scale.min}〜${scale.max}秒`}
                onClick={() => switchScale(i)}
                className="flex h-6 w-6 items-center justify-center"
              >
                <span
                  className={`block h-1.5 w-1.5 rounded-full transition-colors duration-200 ${
                    i === scaleIndex ? "bg-white" : "bg-neutral-600"
                  }`}
                />
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
                onTouchStart={(e) => e.stopPropagation()}
                className={`phase-slider phase-slider-${phaseType}`}
                aria-label={`${config.label}秒数（${scale.min}〜${scale.max}秒）`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* スケール端ラベル（スワイプ検知エリアを兼ねる） */}
      <div className="flex justify-between px-1.5 py-1">
        <span className="text-[10px] text-neutral-600">
          {SCALES[scaleIndex].min}s
        </span>
        <span className="text-[10px] text-neutral-500">← swipe →</span>
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
 * フェーズ秒数をリアルタイムで変更するスワイプカルーセルコンポーネント
 *
 * 各フェーズ（WORK / REST）ごとに、短い時間帯（5-60s）と長い時間帯（60-300s）の
 * 2スケールを切り替えて精密な調整を可能にする。
 *
 * **UXベストプラクティス**:
 * - エラー防止: スライダー操作とスワイプの競合を構造的に分離
 * - フィードバック: ドットインジケーター + スケール端ラベルで状態を即座表示
 * - 発見可能性: "← swipe →" ヒント + タップ可能なドットで操作方法を明示
 * - 制約: ステップスナップで意図しない値を防止
 */
export const PhaseDurationStepper = ({
  phases,
  onChangeDuration,
}: PhaseDurationStepperProps) => {
  /** 指定タイプのフェーズの現在の秒数を取得する */
  const getDuration = (phaseType: PhaseType): number =>
    phases.find((p) => p.type === phaseType)?.durationSec ?? MIN_DURATION_SEC;

  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <PhaseSwipeSlider
        phaseType="work"
        durationSec={getDuration("work")}
        onChangeDuration={onChangeDuration}
      />
      <PhaseSwipeSlider
        phaseType="rest"
        durationSec={getDuration("rest")}
        onChangeDuration={onChangeDuration}
      />
    </div>
  );
};
