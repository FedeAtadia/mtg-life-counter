import type { MetadataRoute } from "next";

/**
 * A metadata route is a route handler, and `output: "export"` refuses to
 * prerender one that has not said it is static. Without this the build fails
 * outright rather than quietly shipping no manifest (PLAT-1).
 */
export const dynamic = "force-static";

/**
 * What a phone reads to decide it can install this, and what it looks like once
 * installed (PWA-1). Next serves it at `/manifest.webmanifest`, and it comes
 * out in the static export like everything else.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MTG Life Counter",
    // What fits under an icon. A longer one is truncated by the launcher.
    short_name: "MTG Life",
    description:
      "Life and commander damage for 2-6 player Magic: The Gathering games, on a phone in the middle of the table.",
    // Standalone and portrait, because the board is a device lying flat on a
    // table rather than a page in a browser (PWA-2).
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    // The table the cards lie on. Matching --bg keeps the launch from flashing
    // a colour the app never uses (PWA-4).
    background_color: "#0a0809",
    theme_color: "#0a0809",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // Android cuts the icon to its own shape, so it needs one drawn with the
      // artwork well inside the safe area (PWA-3).
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
