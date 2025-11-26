// ======================================================
// 🔐 PASSWORD PROTECTION (Same as main script) 
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

    // Masking logic (same as main script)
    process.stdin.on("data", char => {
      char = char + "";
      switch (char) {
        case "\n":
        case "\r":
        case "\u0004":
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

// ------------------------------------------------------
// 🚀 START PROTECTED EXECUTION
// ------------------------------------------------------
(async () => {
  const pass = await askPassword();
  if (pass !== REQUIRED_PASSWORD) {
    console.log("\n❌ Incorrect Password! Exiting...\n");
    process.exit(1);
  }

  console.log("\n✔ Password Verified. Updating Pages...\n");

  // ------------------------------------------------------
  // 📦 REQUIRED MODULES
  // ------------------------------------------------------
  const fs = require("fs");
  const https = require("https");

  const GITHUB_BASE =
    "https://raw.githubusercontent.com/Ajay-kumar-abacus/ionic-location-setup/main/setup-files";
  const PERMISSION_BASE = `${GITHUB_BASE}/permission-source`;
  const BTD_BASE = `${GITHUB_BASE}/background-track-detail-source`;

  const DEST_PERMISSION = "./src/pages/permission";
  const DEST_BTD = "./src/pages/background-track-detail";

  // ------------------------------------------------------
  // 📥 DOWNLOAD FUNCTION
  // ------------------------------------------------------
  function downloadRaw(url, dest) {
    return new Promise((resolve) => {
      https
        .get(url, (resp) => {
          if (resp.statusCode !== 200) {
            console.log("❌ Failed:", url);
            resolve(false);
            return;
          }

          let data = "";
          resp.on("data", (chunk) => (data += chunk));
          resp.on("end", () => {
            fs.writeFileSync(dest, data, "utf8");
            console.log("✔ Updated:", dest);
            resolve(true);
          });
        })
        .on("error", (err) => {
          console.log("❌ Error:", url, err.message);
          resolve(false);
        });
    });
  }

  // ------------------------------------------------------
  // 🔄 UPDATE PERMISSION PAGE
  // ------------------------------------------------------
  console.log("➡ Updating Permission Page...");

  await downloadRaw(
    `${PERMISSION_BASE}/permission.html`,
    `${DEST_PERMISSION}/permission.html`
  );
  await downloadRaw(
    `${PERMISSION_BASE}/permission.ts`,
    `${DEST_PERMISSION}/permission.ts`
  );
  await downloadRaw(
    `${PERMISSION_BASE}/permission.scss`,
    `${DEST_PERMISSION}/permission.scss`
  );
  await downloadRaw(
    `${PERMISSION_BASE}/permission.module.ts`,
    `${DEST_PERMISSION}/permission.module.ts`
  );

  console.log("🎉 Permission Page Updated!");

  // ------------------------------------------------------
  // 🔄 UPDATE BACKGROUND TRACK DETAIL PAGE
  // ------------------------------------------------------
  console.log("➡ Updating Background Track Detail Page...");

  await downloadRaw(
    `${BTD_BASE}/background-track-detail.html`,
    `${DEST_BTD}/background-track-detail.html`
  );
  await downloadRaw(
    `${BTD_BASE}/background-track-detail.ts`,
    `${DEST_BTD}/background-track-detail.ts`
  );
  await downloadRaw(
    `${BTD_BASE}/background-track-detail.scss`,
    `${DEST_BTD}/background-track-detail.scss`
  );
  await downloadRaw(
    `${BTD_BASE}/background-track-detail.module.ts`,
    `${DEST_BTD}/background-track-detail.module.ts`
  );

  console.log("🎉 Background Track Detail Page Updated!");

  // ------------------------------------------------------
  // COMPLETE MESSAGE
  // ------------------------------------------------------
  console.log("\n============================================");
  console.log("     🎉 CODE UPDATE COMPLETE — GENUINE AJAY");
  console.log("============================================\n");
})();
