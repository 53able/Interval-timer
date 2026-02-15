import { useEffect, useRef } from "react";

/**
 * Wake Lock API でスクリーンの自動スリープを防止するフック
 *
 * タイマー実行中にデバイスがスリープに入ることを防ぐ。
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
};
