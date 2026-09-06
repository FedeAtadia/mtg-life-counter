import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SERVICE_WORKER_PATH, useServiceWorker } from "./useServiceWorker";
import { removeServiceWorker, stubServiceWorker } from "../test/serviceWorker";

afterEach(() => {
  removeServiceWorker();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

/** Mounts the hook and lets the registration — a promise — settle. */
async function mount() {
  const view = renderHook(() => useServiceWorker());
  await act(async () => {});
  return view;
}

describe("registering the service worker", () => {
  it("registers the worker once the board is up (PWA-5)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const container = stubServiceWorker();

    await mount();

    expect(container.register).toHaveBeenCalledTimes(1);
    expect(container.register).toHaveBeenCalledWith(SERVICE_WORKER_PATH);
  });

  it("serves the whole app, not just the page it was registered from", async () => {
    // A worker's scope is the directory it is served from, so a worker parked
    // anywhere but the root would leave most of the app uncached.
    expect(SERVICE_WORKER_PATH.startsWith("/")).toBe(true);
    expect(SERVICE_WORKER_PATH.lastIndexOf("/")).toBe(0);
  });

  it("registers only once, however often the board re-renders (PWA-5)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const container = stubServiceWorker();

    const { rerender } = await mount();
    rerender();
    rerender();
    await act(async () => {});

    expect(container.register).toHaveBeenCalledTimes(1);
  });
});

describe("when it cannot work (PWA-8)", () => {
  it("does nothing on a browser with no service workers", async () => {
    vi.stubEnv("NODE_ENV", "production");
    removeServiceWorker();

    // The whole point: no support is not an error, it is just an older phone.
    await expect(mount()).resolves.toBeDefined();
  });

  it("carries on when the browser refuses to register", async () => {
    // An insecure origin and a blocked-storage setting both reject here. The
    // game does not depend on the worker, so a refusal changes nothing.
    vi.stubEnv("NODE_ENV", "production");
    stubServiceWorker(() => Promise.reject(new Error("SecurityError")));

    await expect(mount()).resolves.toBeDefined();
  });

  it("reports what happened, so settings can say so", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubServiceWorker(() => Promise.reject(new Error("SecurityError")));

    const { result } = await mount();

    expect(result.current).toBe("refused");
  });

  it("says so when there is no support at all", async () => {
    vi.stubEnv("NODE_ENV", "production");
    removeServiceWorker();

    const { result } = await mount();

    expect(result.current).toBe("unavailable");
  });

  it("says so when the worker is registered", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubServiceWorker();

    const { result } = await mount();

    expect(result.current).toBe("registered");
  });
});

describe("on a development server (PWA-9)", () => {
  it("registers nothing, so a cached shell cannot serve yesterday's code", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const container = stubServiceWorker();

    const { result } = await mount();

    expect(container.register).not.toHaveBeenCalled();
    expect(result.current).toBe("unavailable");
  });
});
