const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ---------- CONFIG ----------
const PLUGIN_URL = "https://github.com/Ajay-kumar-abacus/cordova-plugin-my-kotlin.git";
const PAGE_NAME = "permission";

// Paths inside YOUR repo (same repo as script)
const SOURCE_PERMISSION = path.join(__dirname, "setup-files/permission");
const SOURCE_BTD = path.join(__dirname, "setup-files/background-track-detail");

// Destination inside Ionic project
const DEST_PERMISSION = `./src/pages/${PAGE_NAME}`;
const DEST_BTD = "./src/pages/background-track-detail";

// ===============================================
// HELPER: COPY FILE FROM REPO TO IONIC PROJECT
// ===============================================
function copyFromRepo(srcFolder, fileName, destFolder) {
  const src = path.join(srcFolder, fileName);
  const dest = path.join(destFolder, fileName);

  if (!fs.existsSync(src)) {
    console.log("❌ File missing in repo:", src);
    return;
  }

  fs.copyFileSync(src, dest);
  console.log("✔ Copied:", fileName);
}

// ===============================================
// STEP 1: INSTALL PLUGIN
// ===============================================
console.log("➡ Installing plugin...");
execSync(`ionic cordova plugin add ${PLUGIN_URL}`, { stdio: "inherit" });

// ===============================================
// STEP 2: GENERATE PERMISSION PAGE
// ===============================================
console.log("➡ Generating new page...");
execSync(`ionic generate page ${PAGE_NAME}`, { stdio: "inherit" });

// ===============================================
// STEP 3: COPY PERMISSION PAGE FILES FROM REPO
// ===============================================
console.log("➡ Copying permission page code...");

copyFromRepo(SOURCE_PERMISSION, "permission.html", DEST_PERMISSION);
copyFromRepo(SOURCE_PERMISSION, "permission.ts", DEST_PERMISSION);
copyFromRepo(SOURCE_PERMISSION, "permission.scss", DEST_PERMISSION);
copyFromRepo(SOURCE_PERMISSION, "permission.module.ts", DEST_PERMISSION);

console.log("🎉 Permission page setup completed!");

// ===============================================
// STEP 4: UPDATE DASHBOARD.TS
// ===============================================
console.log("➡ Updating src/pages/dashboard/dashboard.ts...");

const DASHBOARD_FILE = "./src/pages/dashboard/dashboard.ts";

if (!fs.existsSync(DASHBOARD_FILE)) {
  console.log("❌ dashboard.ts not found at", DASHBOARD_FILE);
  process.exit(0);
}

let code = fs.readFileSync(DASHBOARD_FILE, "utf8");

// ----------------------------------------------------
// 1️⃣ ADD IMPORT FOR PermissionPage
// ----------------------------------------------------
if (!code.includes("import { PermissionPage }")) {
  code = code.replace(
    /import[^;]+;/,
    match => match + `\nimport { PermissionPage } from '../permission/permission';`
  );
  console.log("✔ Added import PermissionPage");
}

// ----------------------------------------------------
// 2️⃣ ADD declare var MyKotlinPlugin
// ----------------------------------------------------
if (!code.includes("declare var MyKotlinPlugin")) {
  code = `declare var MyKotlinPlugin: any;\n` + code;
  console.log("✔ Added declare var MyKotlinPlugin");
}

// ----------------------------------------------------
// 3️⃣ ADD checkAndRequestPermissions()
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
// 4️⃣ Call checkAndRequestPermissions inside ionViewWillEnter()
// ----------------------------------------------------
code = code.replace(
  /ionViewWillEnter\(\)\s*{/,
  `ionViewWillEnter() {\n    this.checkAndRequestPermissions();`
);

// ----------------------------------------------------
// 5️⃣ Replace platform.ready().then() with startTracking()
// ----------------------------------------------------
const readyRegex = /this\.platform\.ready\([\s\S]*?bind\(this\)\)\)/g;
if (readyRegex.test(code)) {
  code = code.replace(readyRegex, "this.startTracking()");
  console.log("✔ Replaced platform.ready().then(...)");
}

// ----------------------------------------------------
// 6️⃣ Insert startTracking()
// ----------------------------------------------------
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
// STEP 5: REPLACE BACKGROUND TRACK DETAIL PAGE
// ===============================================
console.log("➡ Updating Background Track Detail page...");

copyFromRepo(SOURCE_BTD, "background-track-detail.html", DEST_BTD);
copyFromRepo(SOURCE_BTD, "background-track-detail.ts", DEST_BTD);
copyFromRepo(SOURCE_BTD, "background-track-detail.scss", DEST_BTD);
copyFromRepo(SOURCE_BTD, "background-track-detail.module.ts", DEST_BTD);

console.log("🎉 Background Track Detail page updated!");
