import { useState, useMemo, useCallback } from "react";
import { addSeconds, format } from "date-fns";
import { useTimerStore } from "@/stores/timer-store";
import { usePresetStore } from "@/stores/preset-store";
import {
  type Phase,
  type PhaseType,
  MAX_TOTAL_ROUNDS,
  MIN_PHASE_DURATION_SEC,
  MAX_PHASE_DURATION_SEC,
} from "@/schemas/timer";
import { useTimerEngine } from "@/hooks/use-timer-engine";
import type { TimerEngineCallbacks } from "@/hooks/use-timer-engine";
import { useWakeLock } from "@/hooks/use-wake-lock";
import {
  initAudio,
  playPrepareStart,
  playPhaseStart,
  playComplete,
} from "@/audio/sound-engine";
import { MultiRing, RING_COLORS } from "@/components/multi-ring";
import { PhaseDurationStepper } from "@/components/phase-duration-stepper";
import { RoundStepper } from "@/components/round-stepper";
import { BpmControl } from "@/components/bpm-control";
import { PresetDrawer } from "@/components/preset-drawer";

/** 凡例に表示するリング情報 */
const LEGEND_ITEMS = [
  { label: "Total", color: RING_COLORS.total },
  { label: "WORK", color: RING_COLORS.work },
  { label: "REST", color: RING_COLORS.rest },
] as const;

/** 凡例 JSX（静的コンテンツのためモジュールレベルでホイスト: Rule 5.3） */
const legendElement = (
  <div className="mt-6 flex w-full max-w-xs justify-center gap-3">
    {LEGEND_ITEMS.map((item) => (
      <span key={item.label} className="flex items-center gap-1 text-neutral-400">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        <span className="text-xs tracking-wide">{item.label}</span>
      </span>
    ))}
  </div>
);

/** TimerPage のプロパティ型 */
type TimerPageProps = {
  /** 実行対象のプリセットID */
  readonly presetId: string;
  /** プリセット切替時のコールバック（ドロワーから呼ばれる） */
  readonly onSwitchPreset: (presetId: string) => void;
};

/**
 * 現在のフェーズの進捗率を算出する
 *
 * 残り秒数 / フェーズ秒数 で進捗率を返す。フェーズが存在しない場合は 0 を返す。
 */
const calcPhaseProgress = (remainingSec: number, durationSec: number): number =>
  durationSec > 0 ? remainingSec / durationSec : 0;

/**
 * ワークアウト全体の残り秒数を算出する
 *
 * 準備フェーズ中: 準備の残り秒数 + 全ラウンドの合計秒数
 * ラウンドループ中: 残りラウンド × 1ラウンドの秒数 + 現在ラウンドの残りフェーズ秒数
 */
const calcTotalRemainingSec = (
  phases: { readonly durationSec: number }[],
  currentPhaseIndex: number,
  currentRound: number,
  totalRounds: number,
  remainingSec: number,
  isPreparingPhase: boolean,
): number => {
  const oneRoundSec = phases.reduce((sum, p) => sum + p.durationSec, 0);

  // 準備フェーズ中: 準備の残り + 全ラウンド分
  if (isPreparingPhase) {
    return remainingSec + oneRoundSec * totalRounds;
  }

  // ラウンドループ中
  const remainingFullRounds = totalRounds - currentRound;
  const currentRoundRemaining =
    remainingSec +
    phases
      .slice(currentPhaseIndex + 1)
      .reduce((sum, p) => sum + p.durationSec, 0);
  return remainingFullRounds * oneRoundSec + currentRoundRemaining;
};

/**
 * トータル秒数を "M:SS" 形式にフォーマットする
 */
const formatTime = (totalSec: number): string => {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

/**
 * 残り秒数から終了予定時刻を "H:mm" 形式で算出する
 *
 * 現在時刻に残り秒数を加算して終了予定時刻を返す。
 * タイマー実行中は毎秒再計算されるためリアルタイムに更新される。
 */
const formatEstimatedEndTime = (remainingSec: number): string =>
  format(addSeconds(new Date(), remainingSec), "H:mm");

/**
 * タイマー画面コンポーネント
 *
 * マルチリングSVGへのタップ/ロングプレスジェスチャーでタイマーを操作する。
 * useTimerEngine でタイマーループを駆動し、useTimerStore で状態を管理する。
 *
 * **ジェスチャーマッピング**:
 * - idle: タップ → Start
 * - running: タップ → Pause
 * - paused: タップ → Resume、ロングプレス(600ms) → Reset
 * - completed: タップ → Reset
 *
 * **Phase 5 統合**:
 * - サウンド通知: フェーズ切り替え時に通知音、完了時にファンファーレを再生
 * - Wake Lock: タイマー実行中はスクリーンスリープを防止
 * - AudioContext 初期化: リングタップ時にブラウザのオートプレイポリシーを解除
 */
export const TimerPage = ({ presetId, onSwitchPreset }: TimerPageProps) => {
  const status = useTimerStore((s) => s.status);
  const storeRemainingSec = useTimerStore((s) => s.remainingSec);
  const currentPhaseIndex = useTimerStore((s) => s.currentPhaseIndex);
  const currentRound = useTimerStore((s) => s.currentRound);
  const storePhases = useTimerStore((s) => s.phases);
  const storeTotalRounds = useTimerStore((s) => s.totalRounds);
  const storePrepareSec = useTimerStore((s) => s.prepareSec);
  const isPreparingPhase = useTimerStore((s) => s.isPreparingPhase);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const reset = useTimerStore((s) => s.reset);
  const updateTotalRounds = useTimerStore((s) => s.updateTotalRounds);
  const updatePhaseDuration = useTimerStore((s) => s.updatePhaseDuration);

  const presets = usePresetStore((s) => s.presets);
  const preset = presets.find((p) => p.id === presetId);

  /**
   * idle 時の編集用ローカル state
   *
   * プリセットの初期値をコピーし、スタート前にステッパーで自由に変更可能。
   * key={presetId} でコンポーネントがリマウントされるため、
   * プリセット切替時は自然に初期値へリセットされる。
   */
  const [idlePhases, setIdlePhases] = useState<Phase[]>(preset?.phases ?? []);
  const [idleTotalRounds, setIdleTotalRounds] = useState(preset?.totalRounds ?? 1);

  /** idle 時のラウンド数変更ハンドラ（安定参照: 引数のみで完結） */
  const handleIdleUpdateRounds = useCallback((newTotalRounds: number) => {
    setIdleTotalRounds(Math.max(1, Math.min(newTotalRounds, MAX_TOTAL_ROUNDS)));
  }, []);

  /** idle 時のフェーズ秒数変更ハンドラ（安定参照: functional setState で stale closure を回避） */
  const handleIdleUpdateDuration = useCallback((phaseType: PhaseType, newDurationSec: number) => {
    const clamped = Math.max(MIN_PHASE_DURATION_SEC, Math.min(newDurationSec, MAX_PHASE_DURATION_SEC));
    setIdlePhases((prev) =>
      prev.map((p) => (p.type === phaseType ? { ...p, durationSec: clamped } : p)),
    );
  }, []);

  /**
   * 表示用の値を導出する
   *
   * idle / completed 状態ではローカルの編集値（ステッパーで変更済みの可能性あり）、
   * running / paused 状態ではタイマーストアの値を使う。
   * これにより、スタート前後で画面構成・操作性が完全に一貫する。
   */
  const isActive = status === "running" || status === "paused";
  const displayPhases = isActive ? storePhases : idlePhases;
  const displayTotalRounds = isActive ? storeTotalRounds : idleTotalRounds;
  const displayPrepareSec = isActive ? storePrepareSec : (preset?.prepareSec ?? 0);

  /** サウンド通知コールバック（フェーズ遷移 / 完了時に発火） */
  const soundCallbacks: TimerEngineCallbacks = useMemo(
    () => ({
      onPhaseChange: () => {
        const { phases: currentPhases, currentPhaseIndex: idx } =
          useTimerStore.getState();
        const phase = currentPhases[idx];
        if (phase) {
          playPhaseStart(phase.type);
        }
      },
      onComplete: () => {
        playComplete();
      },
    }),
    [],
  );

  useTimerEngine(soundCallbacks);

  /** タイマー実行中はスクリーンスリープを防止 */
  useWakeLock(status === "running");

  // --- 進捗計算（display値を使って統一的に算出） ---
  const currentPhase = isPreparingPhase ? null : displayPhases[currentPhaseIndex];
  const currentPhaseDuration = isPreparingPhase
    ? displayPrepareSec
    : (currentPhase?.durationSec ?? 0);

  const totalSec =
    displayPhases.length > 0
      ? displayPrepareSec +
        displayPhases.reduce((sum, p) => sum + p.durationSec, 0) * displayTotalRounds
      : 0;

  /** idle 時はトータル秒数を「残り」として表示（まだ始まっていないので全量） */
  const totalRemainingSec =
    status === "idle" || status === "completed"
      ? totalSec
      : displayPhases.length > 0
        ? calcTotalRemainingSec(
            displayPhases,
            currentPhaseIndex,
            currentRound,
            displayTotalRounds,
            storeRemainingSec,
            isPreparingPhase,
          )
        : 0;

  const totalProgress = totalSec > 0 ? totalRemainingSec / totalSec : 0;

  /** idle 時のリング中央表示: 準備秒数 or 最初のフェーズ秒数 */
  const idleDisplaySec = displayPrepareSec > 0
    ? displayPrepareSec
    : (displayPhases[0]?.durationSec ?? 0);
  const ringRemainingSec = isActive ? storeRemainingSec : idleDisplaySec;

  const workProgress =
    currentPhase?.type === "work"
      ? calcPhaseProgress(storeRemainingSec, currentPhaseDuration)
      : 0;
  const restProgress =
    currentPhase?.type === "rest"
      ? calcPhaseProgress(storeRemainingSec, currentPhaseDuration)
      : 0;

  /**
   * タイマー開始ハンドラ
   *
   * idle 時にステッパーで編集した phases / totalRounds を反映したプリセットで開始する。
   * AudioContext を初期化してからタイマーを開始する。
   * ブラウザのオートプレイポリシーにより、ユーザー操作起点で
   * AudioContext を resume する必要がある。
   */
  const handleStart = async () => {
    if (preset) {
      const editedPreset = {
        ...preset,
        phases: idlePhases,
        totalRounds: idleTotalRounds,
      };
      await initAudio();
      start(editedPreset);
      if (editedPreset.prepareSec > 0) {
        playPrepareStart();
      }
    }
  };

  /** プリセットを切り替える（タイマーをリセットしてから新しいプリセットをロード） */
  const handleSwitchPreset = useCallback((newPresetId: string) => {
    reset();
    onSwitchPreset(newPresetId);
  }, [reset, onSwitchPreset]);

  /**
   * リングジェスチャーのハンドラとヒントテキストを状態から導出する
   *
   * - idle: タップ → Start
   * - running: タップ → Pause
   * - paused: タップ → Resume、ロングプレス → Reset
   * - completed: タップ → Reset
   */
  const ringTapHandler = (() => {
    switch (status) {
      case "idle":
        return handleStart;
      case "running":
        return pause;
      case "paused":
        return resume;
      case "completed":
        return reset;
    }
  })();

  const ringLongPressHandler = status === "paused" ? reset : undefined;

  /** 状態ごとのリング中央ヒントテキスト */
  const ringHintText = (() => {
    switch (status) {
      case "idle":
        return "TAP TO START";
      case "running":
        return "TAP TO PAUSE";
      case "paused":
        return "TAP / HOLD";
      case "completed":
        return "";
    }
  })();

  /** 状態ごとのリング aria-label */
  const ringAriaLabel = (() => {
    switch (status) {
      case "idle":
        return "タップでスタート";
      case "running":
        return "タップでポーズ";
      case "paused":
        return "タップで再開、長押しでリセット";
      case "completed":
        return "タップでリセット";
    }
  })();

  return (
    <div className="flex min-h-svh flex-col items-center bg-[#0a0a0a] px-4 pt-4 pb-24 text-white">
      {/* ヘッダー: プリセット名（常に表示） */}
      <header className="mb-4 w-full max-w-xs">
        <h1
          className="text-center text-lg font-black tracking-tighter text-neutral-300"
          style={{ letterSpacing: "-0.03em" }}
        >
          {preset?.name ?? "—"}
        </h1>
        <div className="mx-auto mt-1 h-px w-16 bg-red-600/40" />
      </header>

      {/* 完了時: P5スタイリッシュなリザルト画面（タップでリセット） */}
      {status === "completed" ? (
        <button
          type="button"
          className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-6 outline-none transition-transform duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500"
          onClick={reset}
          aria-label="タップでリセット"
        >
          {/* 赤い輝線: 達成の証 */}
          <div className="h-px w-32 bg-linear-to-r from-transparent via-red-500 to-transparent" />
          <h2
            className="text-4xl font-black tracking-tighter text-red-500"
            style={{ letterSpacing: "-0.05em" }}
          >
            COMPLETE
          </h2>
          <p className="text-sm tracking-widest text-neutral-500">
            ワークアウト完了
          </p>
          <p className="text-xs tracking-widest text-neutral-600">
            TAP TO RESET
          </p>
          <div className="h-px w-32 bg-linear-to-r from-transparent via-red-500 to-transparent" />
        </button>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center">
          {/* マルチリングエリア: タップ/ロングプレスでタイマー操作 */}
          <MultiRing
            totalProgress={totalProgress}
            workProgress={workProgress}
            restProgress={restProgress}
            remainingSec={ringRemainingSec}
            hintText={ringHintText}
            onTap={ringTapHandler}
            onLongPress={ringLongPressHandler}
            ariaLabel={ringAriaLabel}
          />

          {/* 凡例（P5: 補助情報は低明度で控えめに） */}
          {legendElement}

          {/* 時間情報ブロック: 終了予定を主役、残り時間を従属（常に表示） */}
          <div className="mt-4 flex flex-col items-center gap-1">
            {totalRemainingSec > 0 && (
              <span
                className="font-mono text-2xl font-black text-white"
                style={{ letterSpacing: "-0.03em" }}
              >
                <span className="text-red-500">→</span>{" "}
                {formatEstimatedEndTime(totalRemainingSec)}
              </span>
            )}
            <span className="font-mono text-xs tracking-wider text-neutral-500">
              残り {formatTime(totalRemainingSec)}
            </span>
          </div>

          {/* ラウンド情報 + フェーズ設定（全状態で統一表示） */}
          <div className="mt-3 flex flex-col gap-3">
            <RoundStepper
              currentRound={currentRound}
              totalRounds={displayTotalRounds}
              isPreparingPhase={status === "idle" || isPreparingPhase}
              onChangeTotalRounds={isActive ? updateTotalRounds : handleIdleUpdateRounds}
            />
            <PhaseDurationStepper
              phases={displayPhases}
              onChangeDuration={isActive ? updatePhaseDuration : handleIdleUpdateDuration}
            />
          </div>

          {/* BPMメトロノーム */}
          <div className="mt-4 flex justify-center">
            <BpmControl />
          </div>
        </div>
      )}

      {/* ボトムドロワー: プリセット一覧 + 登録（片手操作） */}
      <PresetDrawer
        currentPresetId={presetId}
        onSelectPreset={handleSwitchPreset}
      />
    </div>
  );
};
