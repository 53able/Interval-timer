import { useRef, useCallback } from "react";

/** useLongPress に渡すコールバック群 */
type LongPressCallbacks = {
  /** タップ（閾値未満のポインター操作）時に呼ばれる */
  readonly onTap: () => void;
  /** ロングプレス（閾値以上のポインター操作）時に呼ばれる */
  readonly onLongPress?: () => void;
};

/** useLongPress が返すポインターイベントハンドラ群 */
type LongPressHandlers = {
  readonly onPointerDown: (e: React.PointerEvent) => void;
  readonly onPointerUp: (e: React.PointerEvent) => void;
  readonly onPointerLeave: (e: React.PointerEvent) => void;
  readonly onPointerCancel: (e: React.PointerEvent) => void;
};

/** デフォルトのロングプレス判定閾値（ms） */
const DEFAULT_THRESHOLD_MS = 600;

/**
 * タップとロングプレスを判定するカスタムフック
 *
 * PointerEvent を使い、押下からリリースまでの時間で
 * タップ（閾値未満）とロングプレス（閾値以上）を振り分ける。
 *
 * - `onPointerDown`: タイマー開始
 * - `onPointerUp`: タイマーが発火済みなら何もしない、未発火ならタップ扱い
 * - `onPointerLeave` / `onPointerCancel`: タイマーをキャンセル
 *
 * @param callbacks - タップ/ロングプレス時のコールバック
 * @param thresholdMs - ロングプレス判定の閾値（デフォルト: 600ms）
 * @returns PointerEvent ハンドラ群
 */
export const useLongPress = (
  callbacks: LongPressCallbacks,
  thresholdMs: number = DEFAULT_THRESHOLD_MS,
): LongPressHandlers => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  /** 対応する pointerDown が発火済みかどうか。stray な pointerUp を無視するためのガード */
  const isPressedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isPressedRef.current = true;
      isLongPressRef.current = false;
      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        callbacks.onLongPress?.();
      }, thresholdMs);
    },
    [callbacks, thresholdMs],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      // pointerDown なしの stray な pointerUp は無視する
      if (!isPressedRef.current) return;
      isPressedRef.current = false;
      clearTimer();
      if (!isLongPressRef.current) {
        callbacks.onTap();
      }
    },
    [callbacks, clearTimer],
  );

  const onPointerLeave = useCallback(
    (_e: React.PointerEvent) => {
      isPressedRef.current = false;
      clearTimer();
    },
    [clearTimer],
  );

  const onPointerCancel = useCallback(
    (_e: React.PointerEvent) => {
      isPressedRef.current = false;
      clearTimer();
    },
    [clearTimer],
  );

  return { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel };
};
