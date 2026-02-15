import { useEffect, useRef } from "react";
import { useTimerStore } from "@/stores/timer-store";

/**
 * フェーズ切り替え・完了時のコールバック
 *
 * T8（サウンド通知）でこのコールバック経由で音声を再生する。
 */
export type TimerEngineCallbacks = {
  /** フェーズが切り替わった直後に呼ばれる */
  readonly onPhaseChange?: () => void;
  /** 全ラウンド完了時に呼ばれる */
  readonly onComplete?: () => void;
};

/**
 * tick を実行し、フェーズ遷移・完了を検知してコールバックを発火する
 *
 * tick 前後の状態を比較し、フェーズ切り替えまたは完了を検知する。
 * 完了の判定を先に行い、同一 tick でフェーズ変更と完了が同時に起きた場合は
 * onComplete のみを発火する。
 */
const executeTickWithCallbacks = (
  tick: () => void,
  getCallbacks: () => TimerEngineCallbacks | undefined,
) => {
  const { currentPhaseIndex: prevPhaseIndex, status: prevStatus } =
    useTimerStore.getState();

  tick();

  const { currentPhaseIndex: nextPhaseIndex, status: nextStatus } =
    useTimerStore.getState();

  if (nextStatus === "completed" && prevStatus !== "completed") {
    getCallbacks()?.onComplete?.();
    return;
  }

  if (nextPhaseIndex !== prevPhaseIndex) {
    getCallbacks()?.onPhaseChange?.();
  }
};

/**
 * バックグラウンド→フォアグラウンド復帰時に、経過時間分の tick を補正する
 *
 * @param missedCount - 補正すべき tick 回数
 * @param tick - useTimerStore の tick 関数
 * @param getCallbacks - コールバックの最新参照を返す関数
 */
const compensateMissedTicks = (
  missedCount: number,
  tick: () => void,
  getCallbacks: () => TimerEngineCallbacks | undefined,
) => {
  Array.from({ length: missedCount }).every(() => {
    if (useTimerStore.getState().status !== "running") return false;
    executeTickWithCallbacks(tick, getCallbacks);
    return true;
  });
};

/**
 * タイマーエンジンフック
 *
 * `useTimerStore` の `status` を監視し、`running` 時に毎秒 `tick()` を呼び出す。
 *
 * **責務**:
 * 1. `status === "running"` のとき毎秒 `tick()` を実行
 * 2. フェーズ切り替え・完了時にコールバックを発火
 * 3. `visibilitychange` でバックグラウンド復帰時に経過時間を補正
 * 4. `status` 変化・アンマウント時にタイマーをクリーンアップ
 *
 * @param callbacks - フェーズ切り替え・完了時のコールバック（省略可）
 */
export const useTimerEngine = (callbacks?: TimerEngineCallbacks) => {
  const status = useTimerStore((s) => s.status);
  const tick = useTimerStore((s) => s.tick);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  /** tick 用 setInterval の ID。null はループ停止中を示す */
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** バックグラウンドに遷移した時刻（performance.now ベース） */
  const hiddenAtRef = useRef(0);

  // メインのタイマーループ: status が running の間だけ動作
  useEffect(() => {
    if (status !== "running") return;

    intervalIdRef.current = setInterval(() => {
      executeTickWithCallbacks(tick, () => callbacksRef.current);
    }, 1000);

    return () => {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [status, tick]);

  // visibilitychange: バックグラウンド復帰時に経過時間を補正
  useEffect(() => {
    if (status !== "running") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // バックグラウンド遷移: tick ループを停止して時刻を記録
        if (intervalIdRef.current !== null) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
        hiddenAtRef.current = performance.now();
        return;
      }

      // フォアグラウンド復帰: 経過時間分の tick を補正
      const elapsedMs = performance.now() - hiddenAtRef.current;
      const missedTickCount = Math.floor(elapsedMs / 1000);
      const getCallbacks = () => callbacksRef.current;

      compensateMissedTicks(missedTickCount, tick, getCallbacks);

      // 補正後もまだ running なら tick ループを再開
      if (useTimerStore.getState().status === "running") {
        intervalIdRef.current = setInterval(() => {
          executeTickWithCallbacks(tick, getCallbacks);
        }, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, tick]);
};
