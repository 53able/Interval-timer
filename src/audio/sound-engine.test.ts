import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tone.js のモック
 *
 * ブラウザの Web Audio API に依存するため、jsdom 環境ではモックで代替する。
 * triggerAttackRelease の呼び出し（ノート名・デュレーション・タイミング）を検証する。
 *
 * vi.hoisted() で宣言することで、vi.mock のファクトリ巻き上げ時に参照可能にする。
 */
type MockToneContext = {
  state: "suspended" | "running";
  resume: () => Promise<void>;
};

const {
  mockTriggerAttackRelease,
  mockToDestination,
  mockResume,
  mockGetContext,
} = vi.hoisted(() => {
  const mockResumeFn = vi.fn().mockResolvedValue(undefined);
  return {
    mockTriggerAttackRelease: vi.fn(),
    mockToDestination: vi.fn(function (this: unknown) {
      return this;
    }),
    mockResume: mockResumeFn,
    mockGetContext: vi.fn((): MockToneContext => ({
      state: "suspended",
      resume: mockResumeFn,
    })),
  };
});

vi.mock("tone", () => ({
  start: vi.fn().mockResolvedValue(undefined),
  getContext: () => mockGetContext(),
  Synth: vi.fn().mockImplementation(() => ({
    toDestination: mockToDestination,
    triggerAttackRelease: mockTriggerAttackRelease,
  })),
  now: vi.fn().mockReturnValue(0),
}));

import * as Tone from "tone";
import {
  initAudio,
  playComplete,
  playPhaseStart,
  playPrepareStart,
  resumeAudioContext,
} from "./sound-engine";

describe("sound-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if ("audioSession" in navigator) {
      Object.defineProperty(navigator, "audioSession", {
        value: undefined,
        configurable: true,
      });
    }
  });

  describe("initAudio", () => {
    it("Tone.start() が呼ばれて AudioContext が初期化される", async () => {
      // Act
      await initAudio();

      // Assert
      expect(Tone.start).toHaveBeenCalledTimes(1);
    });

    it("navigator.audioSession が存在するとき type を playback に設定する", async () => {
      const audioSession = { type: "auto" };
      Object.defineProperty(navigator, "audioSession", {
        value: audioSession,
        configurable: true,
      });

      await initAudio();

      expect(audioSession.type).toBe("playback");
    });
  });

  describe("resumeAudioContext", () => {
    it("state が suspended のとき resume が呼ばれる", async () => {
      mockGetContext.mockReturnValue({ state: "suspended", resume: mockResume });

      await resumeAudioContext();

      expect(mockResume).toHaveBeenCalledTimes(1);
    });

    it("state が running のとき resume は呼ばれない", async () => {
      mockGetContext.mockReturnValue({
        state: "running",
        resume: mockResume,
      });
      mockResume.mockClear();

      await resumeAudioContext();

      expect(mockResume).not.toHaveBeenCalled();
    });
  });

  describe("playPrepareStart", () => {
    it("準備フェーズで単音（C5）が再生される", () => {
      // Act
      playPrepareStart();

      // Assert: 単音1回のみ
      expect(mockTriggerAttackRelease).toHaveBeenCalledTimes(1);
      expect(mockTriggerAttackRelease).toHaveBeenCalledWith(
        "C5",
        expect.any(String),
        expect.any(Number),
      );
    });
  });

  describe("playPhaseStart", () => {
    it("work フェーズで上昇フレーズ（C4→E4→G4）が再生される", () => {
      // Act
      playPhaseStart("work");

      // Assert: 3音の上昇フレーズ
      expect(mockTriggerAttackRelease).toHaveBeenCalledTimes(3);

      const calls = mockTriggerAttackRelease.mock.calls;
      expect(calls[0][0]).toBe("C4");
      expect(calls[1][0]).toBe("E4");
      expect(calls[2][0]).toBe("G4");
    });

    it("rest フェーズで下降フレーズ（G4→C4）が再生される", () => {
      // Act
      playPhaseStart("rest");

      // Assert: 2音の下降フレーズ
      expect(mockTriggerAttackRelease).toHaveBeenCalledTimes(2);

      const calls = mockTriggerAttackRelease.mock.calls;
      expect(calls[0][0]).toBe("G4");
      expect(calls[1][0]).toBe("C4");
    });
  });

  describe("playComplete", () => {
    it("ファンファーレ（C4→E4→G4→C5）が再生される", () => {
      // Act
      playComplete();

      // Assert: 4音のアルペジオ
      expect(mockTriggerAttackRelease).toHaveBeenCalledTimes(4);

      const calls = mockTriggerAttackRelease.mock.calls;
      expect(calls[0][0]).toBe("C4");
      expect(calls[1][0]).toBe("E4");
      expect(calls[2][0]).toBe("G4");
      expect(calls[3][0]).toBe("C5");
    });
  });
});
