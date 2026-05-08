const fs = require("fs");
const path = require("path");

const platform = process.platform;
if (platform !== "linux" && platform !== "darwin") {
  process.exit(0);
}

const candidates = [
  "node_modules/react-native/sdks/hermesc/linux64-bin/hermesc",
  "node_modules/react-native/sdks/hermesc/osx/hermesc",
  "node_modules/react-native/ReactAndroid/hermesc/linux64-bin/hermesc",
  "node_modules/react-native/ReactAndroid/hermesc/osx/hermesc",
];

const root = process.cwd();
let updated = false;

for (const relativePath of candidates) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) continue;

  try {
    fs.chmodSync(absolutePath, 0o755);
    console.log(`[hermesc] Ensured executable: ${relativePath}`);
    updated = true;
  } catch (error) {
    console.warn(`[hermesc] Failed to chmod ${relativePath}`, error);
  }
}

if (!updated) {
  console.log("[hermesc] No hermesc binary found to chmod.");
}
