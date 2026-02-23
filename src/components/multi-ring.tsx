import { useSpring, animated } from "@react-spring/web";
import { useLongPress } from "@/hooks/use-long-press";

/** リングの色定数（P5赤テーマ体系） */
export const RING_COLORS = {
  /** 外側リング: ワークアウト全体の進捗（メインカラー赤） */
  total: "#E60012",
  /** 中間リング: 作業フェーズの進捗（明るい赤 = 高揚感） */
  work: "#FF4D5C",
  /** 内側リング: 休憩フェーズの進捗（アンバー = 休息の温もり） */
  rest: "#FFB74D",
} as const;

/** AnimatedRing のプロパティ型 */
type AnimatedRingProps = {
  /** リングの半径（px） */
  readonly radius: number;
  /** 進捗率（0〜1、1が満タン） */
  readonly progress: number;
  /** リングの色 */
  readonly color: string;
};

/**
 * スプリングアニメーション付きの進捗リングコンポーネント
 *
 * SVG circle 要素を `@react-spring/web` の `useSpring` + `animated.circle` で
 * アニメーション描画する。`stroke-dasharray` / `stroke-dashoffset` を使い、
 * 円弧の長さで進捗を表現する。
 */
const AnimatedRing = ({ radius, progress, color }: AnimatedRingProps) => {
  const circumference = 2 * Math.PI * radius;
  const styles = useSpring({
    strokeDashoffset: circumference * (1 - progress),
    stroke: color,
    config: { tension: 120, friction: 14 },
  });

  return (
    <animated.circle
      cx="50%"
      cy="50%"
      r={radius}
      fill="none"
      strokeWidth={14}
      strokeDasharray={circumference}
      strokeLinecap="round"
      style={styles}
    />
  );
};

/** MultiRing のプロパティ型 */
type MultiRingProps = {
  /** ワークアウト全体の進捗率（0〜1） */
  readonly totalProgress: number;
  /** 現在の作業フェーズの進捗率（0〜1） */
  readonly workProgress: number;
  /** 現在の休憩フェーズの進捗率（0〜1） */
  readonly restProgress: number;
  /** 中央に表示する残り秒数 */
  readonly remainingSec: number;
  /** リング中央の残り秒数の下に表示するヒントテキスト */
  readonly hintText?: string;
  /** タップ時のコールバック */
  readonly onTap?: () => void;
  /** ロングプレス時のコールバック */
  readonly onLongPress?: () => void;
  /** アクセシビリティ用のラベル */
  readonly ariaLabel?: string;
  /** リング全体（button）に渡すクラス。サイズ指定用（未指定時は h-64 w-64） */
  readonly className?: string;
};

/**
 * マルチリングSVGコンポーネント
 *
 * Apple Watch アクティビティリングに着想を得た3重同心円リング。
 * 外側から Total（赤）、WORK（明るい赤）、REST（アンバー）の進捗を同時に視覚化する。
 * 中央には現在のフェーズの残り秒数をモノスペース太字で大きく表示する。
 *
 * タップ/ロングプレスジェスチャーを受け付け、タイマーの
 * スタート・ポーズ・再開・リセット操作を提供する。
 */
export const MultiRing = ({
  totalProgress,
  workProgress,
  restProgress,
  remainingSec,
  hintText,
  onTap,
  onLongPress,
  ariaLabel = "タイマー操作リング",
  className,
}: MultiRingProps) => {
  const pointerHandlers = useLongPress(
    {
      onTap: () => onTap?.(),
      onLongPress: onLongPress ? () => onLongPress() : undefined,
    },
  );

  return (
    <button
      type="button"
      className={
        className
          ? `group cursor-pointer select-none rounded-full outline-none transition-transform duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${className}`
          : "group mx-auto h-64 w-64 cursor-pointer select-none rounded-full outline-none transition-transform duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
      }
      aria-label={ariaLabel}
      {...pointerHandlers}
    >
      <svg
        viewBox="0 0 200 200"
        className="h-full w-full transition-[filter] duration-200 group-hover:drop-shadow-[0_0_12px_rgba(230,0,18,0.3)]"
        role="img"
        aria-hidden="true"
      >
        <title>タイマー進捗リング</title>
        {/* 外側リング: Total（赤） */}
        <AnimatedRing radius={90} progress={totalProgress} color={RING_COLORS.total} />
        {/* 中間リング: WORK（明るい赤） */}
        <AnimatedRing radius={75} progress={workProgress} color={RING_COLORS.work} />
        {/* 内側リング: REST（アンバー） */}
        <AnimatedRing radius={60} progress={restProgress} color={RING_COLORS.rest} />
        {/* 中央テキスト: 残り秒数（P5: 数字を「見るアート」に） */}
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white font-mono text-5xl font-black"
          style={{ letterSpacing: "-0.05em" }}
        >
          {remainingSec}
        </text>
        {/* ヒントテキスト: 操作ガイド */}
        {hintText && (
          <text
            x="50%"
            y="62%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-neutral-500 text-[8px] tracking-widest"
          >
            {hintText}
          </text>
        )}
      </svg>
    </button>
  );
};
