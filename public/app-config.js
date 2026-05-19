// Runtime app configuration. Edit on the server without rebuilding.
(function () {
  if (window.location.hostname === "admin.cbtgrinder.com") {
    window.__APP_CONFIG__ = Object.assign(
      {
        API_BASE_URL: "https://main.cbtgrinder.com",
      },
      window.__APP_CONFIG__ || {}
    );
  } else {
    window.__APP_CONFIG__ = Object.assign(
      {
        API_BASE_URL: "http://localhost:8080",
      },
      window.__APP_CONFIG__ || {}
    );
  }
})();
