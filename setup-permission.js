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
// STEP 3: COPY PERMISSION PAGE FILES
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

  // ----------------------------------------------------
  // Add PermissionPage import
  // ----------------------------------------------------
  if (!code.includes("import { PermissionPage }")) {
    code = code.replace(
      /import[^;]+;/,
      match => match + `\nimport { PermissionPage } from '../permission/permission';`
    );
    console.log("✔ Added import PermissionPage");
  }

  // ----------------------------------------------------
  // Add declare var MyKotlinPlugin;
  // ----------------------------------------------------
  if (!code.includes("declare var MyKotlinPlugin")) {
    code = `declare var MyKotlinPlugin: any;\n` + code;
    console.log("✔ Added declare var MyKotlinPlugin");
  }

  // ----------------------------------------------------
  // Add checkAndRequestPermissions() function
  // ----------------------------------------------------
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

  // ----------------------------------------------------
  // Inject call inside ionViewWillEnter
  // ----------------------------------------------------
  code = code.replace(
    /ionViewWillEnter\(\)\s*{/,
    `ionViewWillEnter() {\n    this.checkAndRequestPermissions();`
  );

  // ----------------------------------------------------
  // replace platform.ready().then(...) with startTracking()
  // ----------------------------------------------------
  const platformRegex = /this\.platform\.ready\(\)\s*\.then\(\s*this\.configureBackgroundGeolocation\.bind\(this\)\s*\)/g;

  if (platformRegex.test(code)) {
    code = code.replace(platformRegex, "this.startTracking()");
    console.log("✔ Replaced platform.ready().then(...) with this.startTracking()");
  } else {
    console.log("⚠️ Could not find platform.ready().then(...) pattern");
  }

  // ----------------------------------------------------
  // Add startTracking() at the bottom of the class
  // ----------------------------------------------------
  const startTrackFn = `
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

  if (!code.includes("startTracking(")) {
    const lastCurly = code.lastIndexOf("}");
    code = code.slice(0, lastCurly) + startTrackFn + "\n}" + code.slice(lastCurly + 1);
    console.log("✔ Added startTracking() at bottom");
  } else {
    console.log("✔ startTracking() already exists — skipped");
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
  // STEP 6: UPDATE PROFILE PAGE
  // ===============================================
  console.log("➡ Updating Profile Page...");

  const PROFILE_HTML = "./src/pages/profile/profile.html";
  const PROFILE_TS = "./src/pages/profile/profile.ts";

  // Add settings button in profile.html
  if (fs.existsSync(PROFILE_HTML)) {
    let pHtml = fs.readFileSync(PROFILE_HTML, "utf8");

    const buttonCode = `
      <button ion-button icon-only (click)="checkPermissions()">
        <i class="material-icons">settings</i>
      </button>
  `;

    if (!pHtml.includes("checkPermissions()")) {
      pHtml = pHtml.replace(
        /<ion-buttons\s+end\s*>/,
        `$&\n    ${buttonCode}\n`
      );

      fs.writeFileSync(PROFILE_HTML, pHtml, "utf8");
      console.log("✔ Added settings button to profile.html");
    }
  }

  // Add import + checkPermissions() in profile.ts
  if (fs.existsSync(PROFILE_TS)) {
    let pTs = fs.readFileSync(PROFILE_TS, "utf8");

    if (!pTs.includes("PermissionPage")) {
      pTs = pTs.replace(
        /import[^;]+;/,
        match => match + `\nimport { PermissionPage } from '../permission/permission';`
      );
      console.log("✔ Added PermissionPage import in profile.ts");
    }

    const checkFnTs = `
  checkPermissions() { 
    this.navCtrl.push(PermissionPage, { id: this.karigar_detail.id });  
  }
`;

    if (!pTs.includes("checkPermissions()")) {
      pTs = pTs.replace(/}\s*$/, checkFnTs + "\n}");
      console.log("✔ Added checkPermissions() function in profile.ts");
    }

    fs.writeFileSync(PROFILE_TS, pTs, "utf8");
  }

  console.log("🎉 Profile Page updated successfully!");

  console.log("\n===============================================");
  console.log(" 🎉 IONIC MAP-TRACKING SETUP COMPLETE 🎉");
  console.log(" 🚀 Developed by GENUINE AJAY 🚀");
  console.log("===============================================\n");
})();
