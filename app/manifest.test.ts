import { describe, expect, it } from "vitest";
import manifest from "./manifest";

/**
 * The manifest is what a phone reads to decide whether it can install this and
 * what it looks like once installed. Nothing here can prove a browser makes the
 * offer — that is its own decision, and it is written down under Known gaps —
 * but everything the offer depends on is here.
 */
describe("the web app manifest (PWA-1)", () => {
  const m = manifest();

  it("names the app for a home screen", () => {
    expect(m.name).toBeTruthy();
    // The short name is what fits under an icon; a long one gets truncated by
    // the launcher rather than wrapped.
    expect(m.short_name).toBeTruthy();
    expect(m.short_name!.length).toBeLessThanOrEqual(12);
  });

  it("opens standalone, on the board (PWA-2)", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    // A counter that lies flat on a table has one orientation that makes sense.
    expect(m.orientation).toBe("portrait");
  });

  it("carries the icon sizes an installer asks for (PWA-3)", () => {
    const sizes = (m.icons ?? []).map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("carries a maskable icon, so Android does not letterbox it (PWA-3)", () => {
    const maskable = (m.icons ?? []).filter((icon) =>
      icon.purpose?.includes("maskable"),
    );
    expect(maskable.length).toBeGreaterThan(0);
    // Android masks to its own shape and wants the large one to cut from.
    expect(maskable.some((icon) => icon.sizes === "512x512")).toBe(true);
  });

  it("declares every icon as a real type and path", () => {
    for (const icon of m.icons ?? []) {
      expect(icon.type).toBe("image/png");
      expect(icon.src.startsWith("/")).toBe(true);
    }
  });

  it("launches in the board's own colours (PWA-4)", () => {
    // Both are the table the cards lie on. A mismatch here is a flash of some
    // colour the app never uses, on every launch.
    expect(m.background_color).toBe("#0a0809");
    expect(m.theme_color).toBe("#0a0809");
  });
});
