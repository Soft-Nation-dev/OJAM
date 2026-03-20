require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const s3 = new S3Client({
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  region: "auto",
  forcePathStyle: true,
});

function estimateDurationFromSize(size) {
  if (!size || size <= 0) return 0;
  const estimatedBitrate = 128000;
  return Math.round((size * 8) / estimatedBitrate);
}

/**
 * 🔥 ROBUST CATEGORY DETECTION
 */
function extractCategory(key) {
  const validCategories = ["tuesday", "friday", "sunday", "other"];

  const parts = key.split("/").map((p) => p.toLowerCase().trim());
  const fullPath = key.toLowerCase();

  // ✅ 1. First folder (most common case)
  if (parts.length > 1 && validCategories.includes(parts[0])) {
    return parts[0];
  }

  // ✅ 2. Handle "sermons/tuesday/..."
  const sermonsIndex = parts.indexOf("sermons");
  if (sermonsIndex !== -1 && parts.length > sermonsIndex + 1) {
    const possible = parts[sermonsIndex + 1];
    if (validCategories.includes(possible)) {
      return possible;
    }
  }

  // ✅ 3. Fallback: search anywhere in path
  for (const cat of validCategories) {
    if (fullPath.includes(cat)) {
      return cat;
    }
  }

  // ✅ Default
  return "other";
}

function extractTitle(key) {
  const parts = key.split("/");
  const fileName = parts[parts.length - 1];

  return fileName
    .replace(/\.[^.]+$/, "") // remove extension
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/by\s+oluchi.*$/i, "") // remove "BY OLUCHI..." if present
    .trim();
}

async function syncR2WithSupabase() {
  let ContinuationToken;
  let total = 0;

  do {
    const params = {
      Bucket: R2_BUCKET,
      ContinuationToken,
      MaxKeys: 1000,
    };

    const data = await s3.send(new ListObjectsV2Command(params));

    for (const obj of data.Contents || []) {
      const key = obj.Key;

      // 👇 keep this for now (debug)
      console.log("KEY:", key);

      // Only process audio files
      if (!key.match(/\.(mp3|m4a|wav|aac|ogg)$/i)) continue;

      const category = extractCategory(key);
      const title = extractTitle(key);
      const duration = estimateDurationFromSize(obj.Size);

      const { error } = await supabase.from("sermons").upsert(
        [
          {
            title,
            audio_key: key,
            duration,
            preacher: "Pastor Oluchi Japhat Aniagwu",
            date: new Date().toISOString(),
            category,
          },
        ],
        { onConflict: ["audio_key"] }
      );

      if (error) {
        console.error(`❌ Error upserting ${key}:`, error);
      } else {
        console.log(`✅ Synced: ${key} → [${category}]`);
        total++;
      }
    }

    ContinuationToken = data.IsTruncated
      ? data.NextContinuationToken
      : undefined;
  } while (ContinuationToken);

  console.log(`🎉 Done. Synced ${total} sermons.`);
}

syncR2WithSupabase().catch(console.error);