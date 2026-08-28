// Standalone Cloudflare Worker — serves ONLY the two .well-known files
// needed for iOS Universal Links / Android App Links on macgie.com.
// Does not touch or replace anything else on the site; bind it to a
// Route scoped to /.well-known/* only (see cloudflare-setup.md).

const AASA = {
  applinks: {
    apps: [],
    details: [
      {
        appID: "9Z32ZJK4A5.com.auxi2026.app",
        paths: [
          "/discovery-outfit",
          "/discovery-outfit/*",
          "/verify-email",
          "/verify-email/*",
          "/reset-password",
          "/reset-password/*",
        ],
      },
    ],
  },
};

// REPLACE the fingerprint below with the real Play Console / release
// signing SHA-256 before Android App Links will actually verify — see
// cloudflare-setup.md Step 4. Harmless placeholder until then (Android
// links just keep opening in the browser, no crash).
const ASSETLINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.auxi",
      sha256_cert_fingerprints: [
        "REPLACE_ME__SEE_cloudflare-setup.md_STEP_4",
      ],
    },
  },
];

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/.well-known/apple-app-site-association") {
      return new Response(JSON.stringify(AASA, null, 2), {
        headers: { "content-type": "application/json" },
      });
    }

    if (url.pathname === "/.well-known/assetlinks.json") {
      return new Response(JSON.stringify(ASSETLINKS, null, 2), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
