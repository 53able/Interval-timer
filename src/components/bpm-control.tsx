import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { initAudio } from "@/audio/sound-engine";
import {
  MIN_BPM,
  MAX_BPM,
  BPM_STEP,
  startMetronome,
  stopMetronome,
  setMetronomeBpm,
  setMetronomeVolume,
} from "@/audio/metronome-engine";

/** P5モーション: ボタン共通のアニメーションクラス */
const MOTION_CLASS =
  "transition-all duration-200 hover:scale-110 active:scale-90" as const;

/** デフォルトBPM */
const DEFAULT_BPM = 160;

/** デフォルト音量（パーセンテージ） */
const DEFAULT_VOLUME = 50;

/**
 * BPMメトロノームコントロールコンポーネント
 *
 * 片手操作でBPM（140〜200）と音量（0〜100%）を調節しながら
 * メトロノームのON/OFFを制御する。
 *
 * **UXベストプラクティス**:
 * - フィードバック: ON/OFF状態が色で明確に識別可能
 * - 制約: BPM範囲(140〜200)と音量範囲(0〜100)を制限
 * - マッピング: +/- ボタンの直感的な対応
 */
export const BpmControl = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);

  /** メトロノームのON/OFF切替 */
  const handleToggle = useCallback(async () => {
    if (isPlaying) {
      stopMetronome();
      setIsPlaying(false);
    } else {
      await initAudio();
      setMetronomeVolume(volume);
      startMetronome(bpm);
      setIsPlaying(true);
    }
  }, [isPlaying, bpm, volume]);

  /** BPM変更（リアルタイム反映） */
  const handleBpmChange = useCallback(
    (newBpm: number) => {
      const clamped = Math.max(MIN_BPM, Math.min(newBpm, MAX_BPM));
      setBpm(clamped);
      if (isPlaying) {
        setMetronomeBpm(clamped);
      }
    },
    [isPlaying],
  );

  /** 音量変更（リアルタイム反映） */
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const clamped = Math.max(0, Math.min(newVolume, 100));
      setVolume(clamped);
      if (isPlaying) {
        setMetronomeVolume(clamped);
      }
    },
    [isPlaying],
  );

  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      {/* BPMステッパー: 数字タップでON/OFF（OOUI: オブジェクト=BPM値 → アクション=再生切替） */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className={`size-9 rounded-full border-red-800/50 text-neutral-300 hover:border-red-600 hover:text-red-400 ${MOTION_CLASS}`}
          onClick={() => handleBpmChange(bpm - BPM_STEP)}
          disabled={bpm <= MIN_BPM}
          aria-label="BPMを下げる"
        >
          −
        </Button>

        {/* BPM値 = トグルボタン: タップでメトロノームON/OFF */}
        <button
          type="button"
          onClick={handleToggle}
          className={`min-w-24 rounded-lg px-3 py-1.5 font-mono transition-all duration-200 active:scale-95 ${
            isPlaying
              ? "animate-pulse bg-red-600/20 text-red-400 ring-1 ring-red-600/60"
              : "bg-neutral-800/60 text-neutral-300 hover:bg-neutral-700/60"
          }`}
          aria-label={isPlaying ? "メトロノーム停止" : "メトロノーム開始"}
          aria-pressed={isPlaying}
        >
          <span className="text-lg font-bold">{bpm}</span>
          <span className="ml-1 text-xs text-neutral-500">BPM</span>
        </button>

        <Button
          variant="outline"
          size="icon"
          className={`size-9 rounded-full border-red-800/50 text-neutral-300 hover:border-red-600 hover:text-red-400 ${MOTION_CLASS}`}
          onClick={() => handleBpmChange(bpm + BPM_STEP)}
          disabled={bpm >= MAX_BPM}
          aria-label="BPMを上げる"
        >
          +
        </Button>
      </div>

      {/* 音量スライダー */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-wide text-neutral-500">
            メトロノーム音量
          </span>
          <span className="font-mono text-xs text-neutral-400">
            {volume}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="phase-slider phase-slider-work"
          aria-label="メトロノーム音量"
        />
      </div>
    </div>
  );
};
