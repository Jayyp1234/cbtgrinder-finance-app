// Runtime app configuration for finance.cbtgrinder.com.
//
// Edit this file on the server (in dist/) without rebuilding to point the
// app at a different API host. Loaded BEFORE the bundle in index.html so
// the URL is set before the first RTK Query baseQuery is constructed.
//
// Same pattern as the main, admin, and enterprise apps so a deploy to any
// subdomain "just works" without env vars.
(function () {
  if (window.location.hostname === "finance.cbtgrinder.com" || window.location.hostname === "cbtgrinder-finance-app.vercel.app") {
    // Production finance subdomain → real backend at main.
    window.__APP_CONFIG__ = Object.assign(
      {
        API_BASE_URL: "https://main.cbtgrinder.com",
      },
      window.__APP_CONFIG__ || {}
    );
  } else {
    // Local dev (any localhost / 127.0.0.1 / other host) → local PHP server.
    window.__APP_CONFIG__ = Object.assign(
      {
        API_BASE_URL: "http://localhost:8080",
      },
      window.__APP_CONFIG__ || {}
    );
  }
})();
