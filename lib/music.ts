/**
 * Links out to a music app rather than playing anything in the page.
 *
 * On a phone these https links are caught by the YouTube or Spotify app, which
 * owns background audio properly — so the music keeps going while the counter
 * stays on screen and survives the phone locking. A player embedded in the page
 * cannot do either: browsers suspend audio in a backgrounded tab, and using a
 * hidden YouTube player as a music source is against its terms of service.
 *
 * These are searches, not playlist ids, because a made-up playlist id is a
 * button that 404s. Paste a real playlist URL over either one and it will work
 * exactly the same.
 */
export interface MusicLink {
  label: string;
  url: string;
}

export const MUSIC_LINKS: MusicLink[] = [
  {
    label: "YouTube",
    url: "https://www.youtube.com/results?search_query=lord+of+the+rings+complete+recordings",
  },
  {
    label: "Spotify",
    url: "https://open.spotify.com/search/lord%20of%20the%20rings%20soundtrack",
  },
];
