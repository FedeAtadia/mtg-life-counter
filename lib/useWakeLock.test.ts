import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWakeLock } from "./useWakeLock";
import {
  removeWakeLock,
  setVisibility,
  stubWakeLock,
  visibilityChanges,
} from "../test/wakeLock";

afterEach(() => {
  removeWakeLock();
  setVisibility("visible");
  vi.restoreAllMocks();
});

/** Mounts the hook and lets the request — a promise — settle. */
async function mount() {
  const view = renderHook(() => useWakeLock());
  await act(async () => {});
  return view;
}

describe("holding the screen awake", () => {
  it("asks for a screen wake lock as soon as the board is up", async () => {
    const wakeLock = stubWakeLock();

    const { result } = await mount();

    expect(wakeLock.request).toHaveBeenCalledWith("screen");
    expect(result.current).toBe("held");
  });

  it("asks again when the page comes back into view", async () => {
    // The browser takes the lock away every time the tab is hidden or the
    // phone is locked, and refuses to hand out a new one until it is visible
    // again — so asking once, at mount, would keep the screen lit exactly
    // until the first time somebody picked their phone up.
    const wakeLock = stubWakeLock();
    await mount();

    await act(async () => visibilityChanges("hidden"));
    expect(wakeLock.request).toHaveBeenCalledTimes(1);

    await act(async () => visibilityChanges("visible"));
    expect(wakeLock.request).toHaveBeenCalledTimes(2);
  });

  it("does nothing at all where the browser has no wake lock", async () => {
    // iOS before Safari 16.4, or any insecure origin. Nothing is called, and
    // nothing is left listening.
    const listeners = vi.spyOn(document, "addEventListener");

    const { result } = await mount();

    expect(result.current).toBe("unavailable");
    expect(listeners).not.toHaveBeenCalledWith(
      "visibilitychange",
      expect.anything(),
    );
  });

  it("records a refusal rather than retrying in a loop", async () => {
    const wakeLock = stubWakeLock({ refuse: true });

    const { result } = await mount();

    expect(result.current).toBe("refused");
    expect(wakeLock.request).toHaveBeenCalledTimes(1);
  });

  it("releases the lock when the board goes away", async () => {
    const wakeLock = stubWakeLock();
    const { unmount } = await mount();

    unmount();

    expect(wakeLock.latest()!.released).toBe(true);
  });

  it("releases a lock that arrives after the board has gone", async () => {
    // The request is a promise. Unmounting while one is in flight would
    // otherwise leave a lock held with nothing left holding a reference to it.
    const wakeLock = stubWakeLock();
    const view = renderHook(() => useWakeLock());

    view.unmount();
    await act(async () => {});

    expect(wakeLock.latest()!.released).toBe(true);
  });
});
