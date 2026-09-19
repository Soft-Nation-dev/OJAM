import fs from "node:fs";

const app = JSON.parse(fs.readFileSync("app.json", "utf8")).expo;
const eas = JSON.parse(fs.readFileSync("eas.json", "utf8"));
const gradle = fs.readFileSync("android/app/build.gradle", "utf8");
const strings = fs.readFileSync(
  "android/app/src/main/res/values/strings.xml",
  "utf8",
);

const versionName = gradle.match(/versionName\s+["']([^"']+)/)?.[1];
const runtimeVersion = strings.match(/<string name="expo_runtime_version">([^<]+)/)?.[1];
const errors = [];

if (versionName !== app.version) {
  errors.push(`Android versionName ${versionName} does not match app version ${app.version}.`);
}
if (runtimeVersion !== app.runtimeVersion) {
  errors.push(`Android runtime ${runtimeVersion} does not match app runtime ${app.runtimeVersion}.`);
}
for (const profile of ["development", "preview", "production"]) {
  if (eas.build?.[profile]?.channel !== profile) {
    errors.push(`EAS profile ${profile} must use channel ${profile}.`);
  }
}
if (app.web?.bundleUrl !== "https://ojam.com.ng") {
  errors.push("The production PWA URL must be https://ojam.com.ng.");
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(
  `Release config OK: app ${app.version}, runtime ${app.runtimeVersion}, Android code ${gradle.match(/versionCode\s+(\d+)/)?.[1]}.`,
);
