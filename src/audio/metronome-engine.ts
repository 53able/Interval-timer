import * as Tone from "tone";

/** BPM の下限値 */
export const MIN_BPM = 140;

/** BPM の上限値 */
export const MAX_BPM = 200;

/** BPM の増減ステップ */
export const BPM_STEP = 5;

/** 音量パーセンテージの下限値 */
const MIN_VOLUME_PERCENT = 0;

/** 音量パーセンテージの上限値 */
const MAX_VOLUME_PERCENT = 100;

/**
 * 音量パーセンテージ（0〜100）を dB に変換する
 *
 * 0% → -Infinity（ミュート）、100% → 0dB（最大）の対数スケール。
 * 人間の聴覚特性に合わせた自然な音量カーブを提供する。
 */
const percentToDb = (percent: number): number => {
  if (percent <= MIN_VOLUME_PERCENT) return -Infinity;
  if (percent >= MAX_VOLUME_PERCENT) return 0;
  return 20 * Math.log10(percent / 100);
};

/**
 * メトロノームの内部リソース
 *
 * Web Audio API はブラウザのユーザー操作後に初めて利用可能になるため、
 * モジュール読み込み時ではなく、初回利用時に遅延生成する。
 */
type MetronomeResources = {
  readonly volume: Tone.Volume;
  readonly synth: Tone.Synth;
  readonly loop: Tone.Loop;
};

/** 遅延初期化済みリソースのキャッシュ */
let resources: MetronomeResources | null = null;

/**
 * メトロノームリソースを遅延生成・取得する
 *
 * 初回呼び出し時にシンセ・音量ノード・ループを構築し、
 * 2回目以降はキャッシュを返す。
 */
const getResources = (): MetronomeResources => {
  if (resources) return resources;

  const volume = new Tone.Volume(0).toDestination();

  const synth = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.001,
      decay: 0.05,
      sustain: 0,
      release: 0.01,
    },
  }).connect(volume);

  const loop = new Tone.Loop((time) => {
    synth.triggerAttackRelease("G5", "32n", time);
  }, "4n");

  resources = { volume, synth, loop };
  return resources;
};

/**
 * メトロノームを開始する
 *
 * 指定BPMでクリック音のループを開始する。
 * AudioContext が未初期化の場合は initAudio を先に呼ぶこと。
 *
 * @param bpm - テンポ（140〜200）
 */
export const startMetronome = (bpm: number) => {
  const { loop } = getResources();
  Tone.getTransport().bpm.value = bpm;
  loop.start(0);
  Tone.getTransport().start();
};

/**
 * メトロノームを停止する
 */
export const stopMetronome = () => {
  const { loop } = getResources();
  loop.stop();
  Tone.getTransport().stop();
};

/**
 * メトロノームのBPMをリアルタイムで変更する
 *
 * ループ実行中でも即座に反映される。
 *
 * @param bpm - テンポ（140〜200）
 */
export const setMetronomeBpm = (bpm: number) => {
  Tone.getTransport().bpm.value = bpm;
};

/**
 * メトロノームの音量をパーセンテージで設定する
 *
 * @param percent - 音量（0〜100）。0でミュート、100で最大。
 */
export const setMetronomeVolume = (percent: number) => {
  const { volume } = getResources();
  volume.volume.value = percentToDb(percent);
};
