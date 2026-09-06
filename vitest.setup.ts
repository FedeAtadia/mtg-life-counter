import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Registered explicitly rather than relying on Testing Library's automatic
// cleanup, which only installs itself when Vitest is running with globals on.
afterEach(cleanup);

installWorkingStorage();

/**
 * Guarantees the suite has a real Web Storage to run against, whatever Node it
 * is run on.
 *
 * Node ships its own Web Storage, and from Node 24 it is on by default. Its
 * `localStorage` is a getter on the global object, so it is already there when
 * the jsdom environment sets up and jsdom's own Storage never gets installed.
 * Started without `--localstorage-file`, what that getter returns is not a
 * Storage at all — no prototype, no `clear` — so every test that touches a
 * saved game dies on the same line. CI pins Node 22, where none of this
 * happens, which is what makes it invisible until someone runs the suite on a
 * current Node and meets a hundred failures with one cause.
 *
 * On a Node where storage already works this does nothing at all, so CI keeps
 * running against jsdom's own implementation.
 */
function installWorkingStorage() {
  if (typeof globalThis.localStorage?.clear === "function") return;

  // Backed per instance rather than in one shared map, so localStorage and
  // sessionStorage stay separate the way they really are.
  const backing = new WeakMap<Storage, Map<string, string>>();
  const entriesOf = (self: Storage) => {
    let entries = backing.get(self);
    if (!entries) {
      entries = new Map();
      backing.set(self, entries);
    }
    return entries;
  };

  const define = (name: string, value: unknown) =>
    Object.defineProperty(Storage.prototype, name, {
      value,
      writable: true,
      configurable: true,
    });

  // Implemented on Storage.prototype, not on the instance, because that is
  // where the suite spies: `vi.spyOn(Storage.prototype, "setItem")` only
  // intercepts if the object inherits the method rather than owning it. Own
  // methods here would leave those spies never firing, and the assertions that
  // a write did *not* happen would pass for the wrong reason.
  define("getItem", function (this: Storage, key: string) {
    return entriesOf(this).get(String(key)) ?? null;
  });
  define("setItem", function (this: Storage, key: string, value: string) {
    entriesOf(this).set(String(key), String(value));
  });
  define("removeItem", function (this: Storage, key: string) {
    entriesOf(this).delete(String(key));
  });
  define("clear", function (this: Storage) {
    entriesOf(this).clear();
  });
  define("key", function (this: Storage, index: number) {
    return [...entriesOf(this).keys()][index] ?? null;
  });
  Object.defineProperty(Storage.prototype, "length", {
    get(this: Storage) {
      return entriesOf(this).size;
    },
    configurable: true,
  });

  // Defined rather than assigned: what is there is a getter, and would ignore
  // a plain assignment. Writable so a test can still replace or spy on it.
  for (const name of ["localStorage", "sessionStorage"] as const) {
    Object.defineProperty(window, name, {
      value: Object.create(Storage.prototype) as Storage,
      writable: true,
      configurable: true,
    });
  }
}
