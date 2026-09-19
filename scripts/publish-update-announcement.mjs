import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const loadEnvFile = (fileName) => {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
};

loadEnvFile(".env.local");
loadEnvFile(".env");

const args = process.argv.slice(2);
const readArg = (name, fallback = "") => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const version = readArg("version");
const platform = readArg("platform", "all");
const updateType = readArg("type", "ota");
const title = readArg(
  "title",
  version ? `Ojam ${version} is available` : "Ojam update available",
);
const message = readArg(
  "message",
  updateType === "store"
    ? "A new Ojam version is available from the app store."
    : "A new Ojam update is ready. Reopen the app to install it.",
);

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_KEY must be present in .env.",
  );
}

if (!["all", "android", "ios", "web"].includes(platform)) {
  throw new Error("--platform must be all, android, ios, or web.");
}

if (!["ota", "store"].includes(updateType)) {
  throw new Error("--type must be ota or store.");
}

const response = await fetch(
  `${supabaseUrl.replace(/\/$/, "")}/rest/v1/app_update_announcements`,
  {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      title,
      message,
      version: version || null,
      platform,
      update_type: updateType,
    }),
  },
);

if (!response.ok) {
  const detail = await response.text();
  throw new Error(
    `Could not publish update notification (${response.status}): ${detail}`,
  );
}

console.log(
  `Published ${updateType} notification${version ? ` for ${version}` : ""}.`,
);
