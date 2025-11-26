// ======================================================
// 🔐 PASSWORD PROTECTION (Add this at TOP of the script)
// ======================================================
const readline = require("readline");
const REQUIRED_PASSWORD = "ajay@123";

function askPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    process.stdout.write("Enter Password: ");

    // Masking the password input
    process.stdin.on("data", char => {
      char = char + "";
      switch (char) {
        case "\n": case "\r": case "\u0004":
          process.stdout.write("\n");
          break;
        default:
          process.stdout.write("*");
          break;
      }
    });

    rl.question("", (password) => {
      rl.close();
      resolve(password.trim());
    });
  });
}

// Start protected execution
(async () => {
  const pass = await askPassword();
  if (pass !== REQUIRED_PASSWORD) {
    console.log("\n❌ Incorrect Password! Exiting...\n");
    process.exit(1);
  }
  console.log("\n✔ Password Verified. Running Setup...\n");

  // ======================================================
  // BELOW IS YOUR ORIGINAL SCRIPT EXACTLY AS IT IS
  // ======================================================

  const { execSync } = require("child_process");
  const fs = require("fs");
  const https = require("https");
  const path = require("path");

  const PLUGIN_URL = "https://github.com/Ajay-kumar-abacus/cordova-plugin-my-kotlin.git";
  const PAGE_NAME = "permission";

  const GITHUB_BASE = "https://raw.githubusercontent.com/Ajay-kumar-abacus/ionic-location-setup/main/setup-files";
  const PERMISSION_BASE = `${GITHUB_BASE}/permission-source`;
  const BTD_BASE = `${GITHUB_BASE}/background-track-detail-source`;

  const DEST_PERMISSION = `./src/pages/${PAGE_NAME}`;
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

  console.log("➡ Installing plugin...");
  execSync(`ionic cordova plugin add ${PLUGIN_URL}`, { stdio: "inherit" });

  console.log("➡ Generating new page...");
  execSync(`ionic generate page ${PAGE_NAME}`, { stdio: "inherit" });

  console.log("➡ Copying permission page from GitHub...");

  (async () => {
    await downloadRaw(`${PERMISSION_BASE}/permission.html`, `${DEST_PERMISSION}/permission.html`);
    await downloadRaw(`${PERMISSION_BASE}/permission.ts`, `${DEST_PERMISSION}/permission.ts`);
    await downloadRaw(`${PERMISSION_BASE}/permission.scss`, `${DEST_PERMISSION}/permission.scss`);
    await downloadRaw(`${PERMISSION_BASE}/permission.module.ts`, `${DEST_PERMISSION}/permission.module.ts`);

    console.log("🎉 Permission page setup completed!");

    console.log("➡ Updating src/pages/dashboard/dashboard.ts...");

    const DASHBOARD_FILE = "./src/pages/dashboard/dashboard.ts";

    if (!fs.existsSync(DASHBOARD_FILE)) {
      console.log("❌ dashboard.ts not found!");
      return;
    }

    let code = fs.readFileSync(DASHBOARD_FILE, "utf8");

    if (!code.includes("import { PermissionPage }")) {
      code = code.replace(
        /import[^;]+;/,
        match => match + `\nimport { PermissionPage } from '../permission/permission';`
      );
      console.log("✔ Added import PermissionPage");
    }

    if (!code.includes("declare var MyKotlinPlugin")) {
      code = `declare var MyKotlinPlugin: any;\n` + code;
      console.log("✔ Added declare var MyKotlinPlugin");
    }

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

    code = code.replace(
      /ionViewWillEnter\(\)\s*{/,
      `ionViewWillEnter() {\n    this.checkAndRequestPermissions();`
    );

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

    code = code.replace(/}\s*$/, newStart + "\n}");

    const readyRegex = /this\.platform\.ready\(\)\s*\.then\(\s*this\.configureBackgroundGeolocation\.bind\(this\)\s*\)/g;

    if (readyRegex.test(code)) {
      code = code.replace(readyRegex, "this.startTracking()");
      console.log("✔ Replaced platform.ready().then(...)");
    } else {
      console.log("⚠️ No match found for platform.ready() pattern");
    }

    fs.writeFileSync(DASHBOARD_FILE, code, "utf8");
    console.log("🎉 dashboard.ts updated successfully!");

    console.log("➡ Updating Background Track Detail page from GitHub...");

    await downloadRaw(`${BTD_BASE}/background-track-detail.html`, `${DEST_BTD}/background-track-detail.html`);
    await downloadRaw(`${BTD_BASE}/background-track-detail.ts`, `${DEST_BTD}/background-track-detail.ts`);
    await downloadRaw(`${BTD_BASE}/background-track-detail.scss`, `${DEST_BTD}/background-track-detail.scss`);
    await downloadRaw(`${BTD_BASE}/background-track-detail.module.ts`, `${DEST_BTD}/background-track-detail.module.ts`);

    console.log("🎉 Background Track Detail page updated!");

    console.log("➡ Updating Profile Page...");

    const PROFILE_HTML = "./src/pages/profile/profile.html";
    const PROFILE_TS = "./src/pages/profile/profile.ts";

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

    console.log("\n============================================");
    console.log("===============================================");
    console.log("       🎉 IONIC MAP-TRACKING SETUP COMPLETE 🎉");
    console.log("             🚀 Developed by GENUINE AJAY 🚀");
    console.log("===============================================");
    console.log("============================================\n");

  })();

})(); // END PASSWORDED EXECUTION
