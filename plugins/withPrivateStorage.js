const {
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");
module.exports = function (config) {
  config = withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    const app = manifest.application[0];
    app.$["android:allowBackup"] = "false";
    app.$["android:fullBackupContent"] = "false";
    app.$["android:dataExtractionRules"] = "@xml/receipt_data_extraction_rules";
    if (process.env.LEDGER_OFFLINE_RELEASE === "1") {
      manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
      manifest["uses-permission"] = (manifest["uses-permission"] || []).filter(
        (p) => p.$["android:name"] !== "android.permission.INTERNET",
      );
      manifest["uses-permission"].push({
        $: {
          "android:name": "android.permission.INTERNET",
          "tools:node": "remove",
        },
      });
    } else {
      for (const p of manifest["uses-permission"] || [])
        if (p.$["android:name"] === "android.permission.INTERNET")
          delete p.$["tools:node"];
    }
    return c;
  });
  return withDangerousMod(config, [
    "android",
    async (c) => {
      const dir = path.join(
        c.modRequest.platformProjectRoot,
        "app/src/main/res/xml",
      );
      fs.mkdirSync(dir, { recursive: true });
      const exclude = [
        "root",
        "file",
        "database",
        "sharedpref",
        "external",
        "device_root",
        "device_file",
        "device_database",
        "device_sharedpref",
      ]
        .map((d) => `<exclude domain="${d}" path="."/>`)
        .join("");
      fs.writeFileSync(
        path.join(dir, "receipt_data_extraction_rules.xml"),
        `<?xml version="1.0" encoding="utf-8"?><data-extraction-rules><cloud-backup disableIfNoEncryptionCapabilities="true">${exclude}</cloud-backup><device-transfer>${exclude}</device-transfer></data-extraction-rules>`,
      );
      return c;
    },
  ]);
};
