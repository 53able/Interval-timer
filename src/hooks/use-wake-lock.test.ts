import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useWakeLock } from "./use-wake-lock";

describe("useWakeLock", () => {
  const mockRelease = vi.fn().mockResolvedValue(undefined);
  const mockRequest = vi.fn().mockResolvedValue({
    release: mockRelease,
    released: false,
    type: "screen" as const,
    onrelease: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    Object.defineProperty(navigator, "wakeLock", {
      value: { request: mockRequest },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "wakeLock", {
      value: undefined,
      configurable: true,
    });
  });

  it("isActive が true のとき Wake Lock が取得される", async () => {
    // Act
    renderHook(() => useWakeLock(true));

    // Assert: navigator.wakeLock.request("screen") が呼ばれる
    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith("screen");
    });
  });

  it("isActive が false に変わると Wake Lock が解放される", async () => {
    // Arrange: まず Wake Lock を取得
    const { rerender } = renderHook(
      ({ isActive }) => useWakeLock(isActive),
      { initialProps: { isActive: true } },
    );

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith("screen");
    });

    // Act: isActive を false に切り替え
    rerender({ isActive: false });

    // Assert: release() が呼ばれる
    await waitFor(() => {
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  it("Wake Lock API 非対応ブラウザでエラーにならない", () => {
    // Arrange: navigator.wakeLock を未定義にする
    Object.defineProperty(navigator, "wakeLock", {
      value: undefined,
      configurable: true,
    });

    // Act & Assert: エラーなく動作する
    expect(() => {
      renderHook(() => useWakeLock(true));
    }).not.toThrow();
  });

  it("タブ復帰時（visibilitychange → visible）に Wake Lock を再取得する", async () => {
    renderHook(() => useWakeLock(true));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith("screen");
    });
    const callCountAfterInit = mockRequest.mock.calls.length;

    act(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(mockRequest.mock.calls.length).toBeGreaterThan(callCountAfterInit);
    });
  });
});
