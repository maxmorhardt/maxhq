import HTML from "./maintenance.html";

const RETRY_AFTER = "86400";

export default {
  fetch(request) {
    const url = new URL(request.url);

    // APIs: JSON, not HTML, so frontends/clients don't try to parse a webpage.
    if (url.hostname === "api.maxstash.io" || url.hostname.startsWith("api.")) {
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
