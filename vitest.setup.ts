import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Registered explicitly rather than relying on Testing Library's automatic
// cleanup, which only installs itself when Vitest is running with globals on.
afterEach(cleanup);
