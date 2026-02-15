import { Button } from "@/components/ui/button";

/** セット回数の上限値（timer-store と同一） */
const MAX_TOTAL_ROUNDS = 99;

/** RoundStepper のプロパティ型 */
type RoundStepperProps = {
  /** 現在のラウンド番号（1始まり） */
  readonly currentRound: number;
  /** 設定中のセット回数 */
  readonly totalRounds: number;
  /** 準備フェーズ中かどうか */
  readonly isPreparingPhase: boolean;
  /** セット回数変更コールバック */
  readonly onChangeTotalRounds: (newTotalRounds: number) => void;
};

/**
 * セット回数をリアルタイムで変更するステッパーコンポーネント
 *
 * 片手（親指）で操作可能な大きめタッチターゲットの +/- ボタンを提供する。
 * 準備フェーズ中は「準備中」ラベルとセット回数を表示し、
 * ラウンドループ中は「ラウンド X / Y」と +/- ボタンを表示する。
 *
 * **制約によるエラー防止**:
 * - 「-」ボタン: 現在ラウンド以下に減らせないとき disabled
 * - 「+」ボタン: 上限（99）に達したとき disabled
 */
export const RoundStepper = ({
  currentRound,
  totalRounds,
  isPreparingPhase,
  onChangeTotalRounds,
}: RoundStepperProps) => {
  const canDecrement = isPreparingPhase
    ? totalRounds > 1
    : totalRounds > currentRound;
  const canIncrement = totalRounds < MAX_TOTAL_ROUNDS;

  const handleDecrement = () => {
    if (canDecrement) {
      onChangeTotalRounds(totalRounds - 1);
    }
  };

  const handleIncrement = () => {
    if (canIncrement) {
      onChangeTotalRounds(totalRounds + 1);
    }
  };

  return (
    <div className="flex items-center justify-center gap-5">
      {/* 減少ボタン */}
      <Button
        variant="outline"
        size="icon-lg"
        className="h-12 w-12 rounded-full border-red-800/50 text-lg text-neutral-300 transition-all duration-200 hover:scale-110 hover:border-red-600 hover:text-red-400 hover:shadow-md hover:shadow-red-900/20 active:scale-90"
        onClick={handleDecrement}
        disabled={!canDecrement}
        aria-label="セット回数を減らす"
      >
        −
      </Button>

      {/* ラウンド表示 */}
      <div className="min-w-32 text-center">
        {isPreparingPhase ? (
          <div className="flex flex-col items-center">
            <span className="text-sm text-neutral-400">
              <span className="font-bold text-white">{totalRounds}</span> セット
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-sm text-neutral-400">
              ラウンド{" "}
              <span className="font-bold text-white">{currentRound}</span>
              {" / "}
              <span className="font-bold text-white">{totalRounds}</span>
            </span>
          </div>
        )}
      </div>

      {/* 増加ボタン */}
      <Button
        variant="outline"
        size="icon-lg"
        className="h-12 w-12 rounded-full border-red-800/50 text-lg text-neutral-300 transition-all duration-200 hover:scale-110 hover:border-red-600 hover:text-red-400 hover:shadow-md hover:shadow-red-900/20 active:scale-90"
        onClick={handleIncrement}
        disabled={!canIncrement}
        aria-label="セット回数を増やす"
      >
        +
      </Button>
    </div>
  );
};
