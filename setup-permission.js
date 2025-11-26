const { execSync } = require("child_process");
const fs = require("fs");
const https = require("https");
const path = require("path");

// ---------- CONFIG ----------
const PLUGIN_URL = "https://github.com/Ajay-kumar-abacus/cordova-plugin-my-kotlin.git";
const PAGE_NAME = "permission";

// GitHub RAW base URLs
const GITHUB_BASE = "https://raw.githubusercontent.com/Ajay-kumar-abacus/ionic-location-setup/main/setup-files";
const PERMISSION_BASE = `${GITHUB_BASE}/permission-source`;
const BTD_BASE = `${GITHUB_BASE}/background-track-detail-source`;

// Destination folders inside Ionic project
const DEST_PERMISSION = `./src/pages/${PAGE_NAME}`;
const DEST_BTD = "./src/pages/background-track-detail";

// --------------------------------------------------------
// DOWNLOAD FILE DIRECTLY FROM GITHUB RAW INTO DESTINATION
// --------------------------------------------------------
function downloadRaw(url, dest) {
  return new Promise((resolve) => {
    https.get(url, (resp) => {
      if (resp.statusCode !== 200) {
        console.log("❌ Failed:", url);
        resolve(false);
        return;
      }

      let data = "";
      resp.on("data", chunk => data += chunk);
      resp.on("end", () => {
        fs.writeFileSync(dest, data, "utf8");
        console.log("✔ Copied:", dest);
        resolve(true);
      });

    }).on("error", err => {
      console.log("❌ Error downloading:", url, err.message);
      resolve(false);
    });
  });
}

// --------------------------------------------------------
// STEP 1: INSTALL PLUGIN
// --------------------------------------------------------
console.log("➡ Installing plugin...");
execSync(`ionic cordova plugin add ${PLUGIN_URL}`, { stdio: "inherit" });

// --------------------------------------------------------
// STEP 2: GENERATE PERMISSION PAGE
// --------------------------------------------------------
console.log("➡ Generating new page...");
execSync(`ionic generate page ${PAGE_NAME}`, { stdio: "inherit" });

// --------------------------------------------------------
// STEP 3: COPY PERMISSION PAGE FILES FROM GITHUB
// --------------------------------------------------------
console.log("➡ Copying permission page from GitHub...");

(async () => {
  await downloadRaw(`${PERMISSION_BASE}/permission.html`, `${DEST_PERMISSION}/permission.html`);
  await downloadRaw(`${PERMISSION_BASE}/permission.ts`, `${DEST_PERMISSION}/permission.ts`);
  await downloadRaw(`${PERMISSION_BASE}/permission.scss`, `${DEST_PERMISSION}/permission.scss`);
  await downloadRaw(`${PERMISSION_BASE}/permission.module.ts`, `${DEST_PERMISSION}/permission.module.ts`);

  console.log("🎉 Permission page setup completed!");

  // ===============================================
  // STEP 4: UPDATE DASHBOARD.TS
  // ===============================================
  console.log("➡ Updating src/pages/dashboard/dashboard.ts...");

  const DASHBOARD_FILE = "./src/pages/dashboard/dashboard.ts";

  if (!fs.existsSync(DASHBOARD_FILE)) {
    console.log("❌ dashboard.ts not found!");
    return;
  }

  let code = fs.readFileSync(DASHBOARD_FILE, "utf8");

  // Add PermissionPage import
  if (!code.includes("import { PermissionPage }")) {
    code = code.replace(
      /import[^;]+;/,
      match => match + `\nimport { PermissionPage } from '../permission/permission';`
    );
    console.log("✔ Added import PermissionPage");
  }

  // Add declare var
  if (!code.includes("declare var MyKotlinPlugin")) {
    code = `declare var MyKotlinPlugin: any;\n` + code;
    console.log("✔ Added declare var MyKotlinPlugin");
  }

  // Insert checkAndRequestPermissions
  const checkFn = `
  checkAndRequestPermissions() {
    if (this.platform.is('cordova') && this.platform.is('android')) {
      MyKotlinPlugin.getDeviceDataNoPermissionRequest(
        (result) => {
          let allPermissionsGranted = false;

          if (result.permissions && result.settings) {
            allPermissionsGranted =
              (result.permissions.fineLocation || result.permissions.coarseLocation) &&
              result.permissions.backgroundLocation &&
              result.settings.isLocationEnabled &&
              !result.settings.isBatteryOptimized;
          }

          if (!allPermissionsGranted) {
            this.navCtrl.push(PermissionPage, { 
              id: this.user_id, 
              from: 'dashboard',
              deviceData: result  
            });
          }
        },
        (error) => {
          console.error('Permission error:', error);
          this.service.errorToast('Error checking permissions');
        }
      );
    }
  }
`;

  if (!code.includes("checkAndRequestPermissions()")) {
    code = code.replace(/}\s*$/, checkFn + "\n}");
    console.log("✔ checkAndRequestPermissions() added");
  }

  // Add call inside ionViewWillEnter
  code = code.replace(
    /ionViewWillEnter\(\)\s*{/,
    `ionViewWillEnter() {\n    this.checkAndRequestPermissions();`
  );

  // Replace platform.ready().then()
  const readyRegex = /this\.platform\.ready\([\s\S]*?bind\(this\)\)\)/g;
  if (readyRegex.test(code)) {
    code = code.replace(readyRegex, "this.startTracking()");
    console.log("✔ Replaced platform.ready().then(...)");
  }

  // Insert startTracking
  const newStart = `
  startTracking() {
    MyKotlinPlugin.startTracking(
      (success) => {
        this.service.presentToast('Background tracking started!');
      },
      (error) => {
        console.error('Tracking failed:', error);
        this.service.errorToast('Failed to start tracking');
      },
      { userId: this.user_id, startTime: new Date().toISOString() }
    );
  }
`;

  if (code.includes("startTracking(")) {
    code = code.replace(/startTracking\([\s\S]*?}\s*}/, newStart);
  } else {
    code = code.replace(/}\s*$/, newStart + "\n}");
  }

  fs.writeFileSync(DASHBOARD_FILE, code, "utf8");
  console.log("🎉 dashboard.ts updated successfully!");

  // ===============================================
  // STEP 5: DOWNLOAD BACKGROUND TRACK DETAIL PAGE
  // ===============================================
  console.log("➡ Updating Background Track Detail page from GitHub...");

  await downloadRaw(`${BTD_BASE}/background-track-detail.html`, `${DEST_BTD}/background-track-detail.html`);
  await downloadRaw(`${BTD_BASE}/background-track-detail.ts`, `${DEST_BTD}/background-track-detail.ts`);
  await downloadRaw(`${BTD_BASE}/background-track-detail.scss`, `${DEST_BTD}/background-track-detail.scss`);
  await downloadRaw(`${BTD_BASE}/background-track-detail.module.ts`, `${DEST_BTD}/background-track-detail.module.ts`);

  console.log("🎉 Background Track Detail page updated!");

  // ===============================================
// STEP X: UPDATE PROFILE PAGE (HTML + TS)
// ===============================================
console.log("➡ Updating Profile Page...");

const PROFILE_HTML = "./src/pages/profile/profile.html";
const PROFILE_TS = "./src/pages/profile/profile.ts";

// ----------------------------------------------------
// 1️⃣ Modify profile.html → Add settings button
// ----------------------------------------------------
if (fs.existsSync(PROFILE_HTML)) {
  let pHtml = fs.readFileSync(PROFILE_HTML, "utf8");

  const buttonCode = `
      <button ion-button icon-only (click)="checkPermissions()">
        <i class="material-icons">settings</i>
      </button>
  `;

  // Add inside <ion-buttons end> only if not already present
  if (!pHtml.includes("checkPermissions()")) {
    pHtml = pHtml.replace(
      /<ion-buttons\s+end\s*>/,
      `$&\n    ${buttonCode}\n`
    );

    fs.writeFileSync(PROFILE_HTML, pHtml, "utf8");
    console.log("✔ Added settings button to profile.html");
  } else {
    console.log("✔ profile.html already updated — skipped");
  }
} else {
  console.log("❌ profile.html not found");
}

// ----------------------------------------------------
// 2️⃣ Modify profile.ts → Add import + function
// ----------------------------------------------------
if (fs.existsSync(PROFILE_TS)) {
  let pTs = fs.readFileSync(PROFILE_TS, "utf8");

  // Add import for PermissionPage if missing
  if (!pTs.includes("PermissionPage")) {
    pTs = pTs.replace(
      /import[^;]+;/,
      match => match + `\nimport { PermissionPage } from '../permission/permission';`
    );
    console.log("✔ Added PermissionPage import in profile.ts");
  }

  // Insert function at bottom of class
  const checkFnTs = `
  checkPermissions() { 
    this.navCtrl.push(PermissionPage, { id: this.karigar_detail.id });  
  }
`;

  if (!pTs.includes("checkPermissions()")) {
    pTs = pTs.replace(/}\s*$/, checkFnTs + "\n}");
    console.log("✔ Added checkPermissions() function in profile.ts");
  } else {
    console.log("✔ checkPermissions() already exists — skipped");
  }

  fs.writeFileSync(PROFILE_TS, pTs, "utf8");

} else {
  console.log("❌ profile.ts not found");
}

console.log("🎉 Profile Page updated successfully!");
console.log("\n============================================");
  console.log("===============================================");
  console.log(" 🎉 IONIC MAP-TRACKING SETUP COMPLETE 🎉");
  console.log(" 🚀 Developed by GENUINE AJAY 🚀");
  console.log("===============================================");
  console.log("============================================\n");
})();

