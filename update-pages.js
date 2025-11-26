const fs = require("fs");
const https = require("https");

const GITHUB_BASE = "https://raw.githubusercontent.com/Ajay-kumar-abacus/ionic-location-setup/main/setup-files";
const PERMISSION_BASE = `${GITHUB_BASE}/permission-source`;
const BTD_BASE = `${GITHUB_BASE}/background-track-detail-source`;

const DEST_PERMISSION = "./src/pages/permission";
const DEST_BTD = "./src/pages/background-track-detail";

function downloadRaw(url, dest) {
  return new Promise((resolve) => {
    https.get(url, (resp) => {
      if (resp.statusCode !== 200) {
        console.log("❌ Failed:", url);
        resolve(false);
        return;
      }

      let data = "";
      resp.on("data", (chunk) => data += chunk);
      resp.on("end", () => {
        fs.writeFileSync(dest, data, "utf8");
        console.log("✔ Updated:", dest);
        resolve(true);
      });

    }).on("error", (err) => {
      console.log("❌ Error:", url, err.message);
      resolve(false);
    });
  });
}

// ------------------------------------------------------
// 🚀 START UPDATE PROCESS
// ------------------------------------------------------
(async () => {
  console.log("➡ Updating Permission Page...");

  await downloadRaw(`${PERMISSION_BASE}/permission.html`, `${DEST_PERMISSION}/permission.html`);
  await downloadRaw(`${PERMISSION_BASE}/permission.ts`, `${DEST_PERMISSION}/permission.ts`);
  await downloadRaw(`${PERMISSION_BASE}/permission.scss`, `${DEST_PERMISSION}/permission.scss`);
  await downloadRaw(`${PERMISSION_BASE}/permission.module.ts`, `${DEST_PERMISSION}/permission.module.ts`);

  console.log("🎉 Permission Page Updated!\n");

  console.log("➡ Updating Background Track Detail Page...");

  await downloadRaw(`${BTD_BASE}/background-track-detail.html`, `${DEST_BTD}/background-track-detail.html`);
  await downloadRaw(`${BTD_BASE}/background-track-detail.ts`, `${DEST_BTD}/background-track-detail.ts`);
  await downloadRaw(`${BTD_BASE}/background-track-detail.scss`, `${DEST_BTD}/background-track-detail.scss`);
  await downloadRaw(`${BTD_BASE}/background-track-detail.module.ts`, `${DEST_BTD}/background-track-detail.module.ts`);

  console.log("🎉 Background Track Detail Page Updated!");

  console.log("\n============================================");
  console.log("     🎉 CODE UPDATE COMPLETE — GENUINE AJAY");
  console.log("============================================\n");
})();
