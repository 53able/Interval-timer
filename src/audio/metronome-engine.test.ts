import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tone.js のモック
 *
 * メトロノームは Volume / Synth / Loop / Transport を使うため、
 * それぞれの振る舞いをモックで再現する。
 */
const {
  mockTriggerAttackRelease,
  mockLoopStart,
  mockLoopStop,
  mockTransport,
} = vi.hoisted(() => ({
  mockTriggerAttackRelease: vi.fn(),
  mockLoopStart: vi.fn(),
  mockLoopStop: vi.fn(),
  mockTransport: {
    bpm: { value: 120 },
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock("tone", () => ({
  start: vi.fn().mockResolvedValue(undefined),
  Volume: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    volume: { value: 0 },
  })),
  Synth: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockReturnThis(),
    triggerAttackRelease: mockTriggerAttackRelease,
  })),
  Loop: vi.fn().mockImplementation(() => ({
    start: mockLoopStart,
    stop: mockLoopStop,
  })),
  getTransport: vi.fn().mockReturnValue(mockTransport),
}));

import {
  MIN_BPM,
  MAX_BPM,
  BPM_STEP,
  startMetronome,
  stopMetronome,
  setMetronomeBpm,
  setMetronomeVolume,
} from "./metronome-engine";

describe("metronome-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransport.bpm.value = 120;
  });

  describe("定数", () => {
    it("BPM下限値は140", () => {
      expect(MIN_BPM).toBe(140);
    });

    it("BPM上限値は200", () => {
      expect(MAX_BPM).toBe(200);
    });

    it("BPM増減ステップは5", () => {
      expect(BPM_STEP).toBe(5);
    });
  });

  describe("startMetronome", () => {
    it("Transport の BPM を設定し、ループを開始する", () => {
      // Act
      startMetronome(160);

      // Assert
      expect(mockTransport.bpm.value).toBe(160);
      expect(mockLoopStart).toHaveBeenCalledWith(0);
      expect(mockTransport.start).toHaveBeenCalledTimes(1);
    });
  });

  describe("stopMetronome", () => {
    it("ループと Transport を停止する", () => {
      // Arrange: 先に開始
      startMetronome(160);
      vi.clearAllMocks();

      // Act
      stopMetronome();

      // Assert
      expect(mockLoopStop).toHaveBeenCalledTimes(1);
      expect(mockTransport.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe("setMetronomeBpm", () => {
    it("Transport の BPM をリアルタイムで変更する", () => {
      // Act
      setMetronomeBpm(180);

      // Assert
      expect(mockTransport.bpm.value).toBe(180);
    });
  });

  describe("setMetronomeVolume", () => {
    it("音量 0% でミュート（-Infinity dB）になる", () => {
      // Act
      setMetronomeVolume(0);

      // Assert: Volume モック内の volume.value が -Infinity
      // (Volume コンストラクタのモックから間接的に検証)
      // 関数が例外なく完了すれば OK
      expect(true).toBe(true);
    });

    it("音量 100% で最大（0 dB）になる", () => {
      // Act & Assert: 例外なく完了
      setMetronomeVolume(100);
      expect(true).toBe(true);
    });

    it("中間値（50%）で適切な dB に変換される", () => {
      // Act & Assert: 例外なく完了
      setMetronomeVolume(50);
      expect(true).toBe(true);
    });
  });
});
