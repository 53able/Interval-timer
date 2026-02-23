import { useEffect, useRef } from "react";

/**
 * Wake Lock API でスクリーンの自動スリープを防止するフック
 *
 * タイマー実行中にデバイスがスリープに入ることを防ぐ。
 * タブ復帰時（visibilitychange → visible）に Wake Lock を再取得する。
 * Wake Lock API 非対応ブラウザでは何もしない（グレースフルフォールバック）。
 *
 * @param isActive - `true` で Wake Lock を取得、`false` で解放
 *
 * @example
 * ```tsx
 * const TimerPage = () => {
 *   const status = useTimerStore((s) => s.status);
 *   useWakeLock(status === "running");
 * };
 * ```
 */
export const useWakeLock = (isActive: boolean) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  useEffect(() => {
    if (!navigator.wakeLock) return;

    if (isActive) {
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          wakeLockRef.current = sentinel;
        })
        .catch(() => {
          // Wake Lock 取得失敗（バックグラウンドタブ等）は無視する
        });
    } else {
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    }

    return () => {
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [isActive]);

  // タブ復帰時に Wake Lock を再取得（ブラウザが hidden で解放するため）
  useEffect(() => {
    if (!navigator.wakeLock || !isActive) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !isActiveRef.current) return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          wakeLockRef.current = sentinel;
        })
        .catch(() => {});
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isActive]);
};
