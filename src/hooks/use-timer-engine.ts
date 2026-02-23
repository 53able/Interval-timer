import { useEffect, useRef } from "react";
import { resumeAudioContext } from "@/audio/sound-engine";
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

/** hidden 時点の状態スナップショット（syncFromElapsed 用） */
type HiddenSnapshot = Pick<
  ReturnType<typeof useTimerStore.getState>,
  "remainingSec" | "currentPhaseIndex" | "currentRound" | "isPreparingPhase" | "phases" | "totalRounds" | "prepareSec"
>;

/**
 * タイマーエンジンフック
 *
 * `useTimerStore` の `status` を監視し、`running` 時に毎秒 `tick()` を呼び出す。
 *
 * **責務**:
 * 1. `status === "running"` のとき毎秒 `tick()` を実行
 * 2. フェーズ切り替え・完了時にコールバックを発火
 * 3. `visibilitychange` でバックグラウンド時は interval を止めず、復帰時に経過時間で state のみ補正（サウンドは鳴らさない）
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
  /** バックグラウンド遷移時点の状態スナップショット（復帰時の補正で使用） */
  const hiddenSnapshotRef = useRef<HiddenSnapshot | null>(null);

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

  // visibilitychange: hidden では interval を止めず、復帰時に経過時間で state のみ補正
  useEffect(() => {
    if (status !== "running") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // バックグラウンド遷移: 時刻と状態スナップショットを記録。interval は止めない
        const state = useTimerStore.getState();
        hiddenAtRef.current = performance.now();
        hiddenSnapshotRef.current = {
          remainingSec: state.remainingSec,
          currentPhaseIndex: state.currentPhaseIndex,
          currentRound: state.currentRound,
          isPreparingPhase: state.isPreparingPhase,
          phases: state.phases,
          totalRounds: state.totalRounds,
          prepareSec: state.prepareSec,
        };
        return;
      }

      // フォアグラウンド復帰: AudioContext を resume（iOS 等で suspended になっている場合）
      void resumeAudioContext();

      // スナップショットから経過秒数分だけ状態を補正（コールバックは発火させない）
      const snapshot = hiddenSnapshotRef.current;
      if (snapshot !== null) {
        const elapsedMs = performance.now() - hiddenAtRef.current;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        useTimerStore.getState().syncFromElapsed(snapshot, elapsedSec);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status]);
};
