import HTML from "./maintenance.html";
import JETBRAINS_MONO from "./fonts/jetbrains-mono.woff2";
import MONA_SANS from "./fonts/mona-sans.woff2";

const RETRY_AFTER = "86400";

// the page's fonts ride along in the worker so it loads nothing from another origin
const FONTS = {
  "/_maintenance/mona-sans.woff2": MONA_SANS,
  "/_maintenance/jetbrains-mono.woff2": JETBRAINS_MONO,
};

export default {
  fetch(request) {
    const url = new URL(request.url);

    // json maintence response for apis
    if (url.hostname === "api.maxhq.io" || url.hostname.startsWith("api.")) {
      return new Response(
        JSON.stringify({
          error: "maintenance",
          message: "Service temporarily unavailable for scheduled maintenance.",
        }),
        {
          status: 503,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "retry-after": RETRY_AFTER,
            "cache-control": "no-store",
          },
        },
      );
    }

    const font = FONTS[url.pathname];
    if (font) {
      return new Response(font, {
        headers: {
          "content-type": "font/woff2",
          "cache-control": "public, max-age=86400",
        },
      });
    }

    return new Response(HTML, {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": RETRY_AFTER,
        "cache-control": "no-store",
      },
    });
  },
};
