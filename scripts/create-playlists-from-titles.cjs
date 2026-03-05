const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "part",
  "day",
  "god",
  "jesus",
  "holy",
  "spirit",
  "of",
  "to",
  "in",
  "on",
  "at",
  "a",
  "an",
]);

const normalizeTitleKey = (title) => {
  const cleaned = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned
    .split(" ")
    .filter((w) => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w));

  return words.slice(0, 3).join(" ");
};

const toTitleCase = (value) =>
  value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

async function createPlaylists() {
  const reset = process.argv.includes("--reset");

  if (reset) {
    await supabase
      .from("playlist_items")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("playlists")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: sermons, error } = await supabase
    .from("sermons")
    .select("id, title");

  if (error) {
    console.error("Error fetching sermons:", error);
    process.exit(1);
  }

  const groups = new Map();
  (sermons || []).forEach((sermon) => {
    const key = normalizeTitleKey(sermon.title);
    if (!key) return;
    const list = groups.get(key) || [];
    list.push(sermon);
    groups.set(key, list);
  });

  for (const [key, group] of groups.entries()) {
    if (group.length < 2) continue;

    const name = toTitleCase(key);
    const { data: playlistRows, error: playlistError } = await supabase
      .from("playlists")
      .insert({ name, description: `Messages about ${name}` })
      .select("id")
      .single();

    if (playlistError) {
      console.error("Error creating playlist:", name, playlistError);
      continue;
    }

    const playlistId = playlistRows.id;
    const items = group.map((sermon, index) => ({
      playlist_id: playlistId,
      sermon_id: sermon.id,
      position: index,
    }));

    const { error: itemsError } = await supabase
      .from("playlist_items")
      .insert(items);

    if (itemsError) {
      console.error("Error creating playlist items:", name, itemsError);
    } else {
      console.log(`Created playlist: ${name} (${group.length} items)`);
    }
  }
}

createPlaylists().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
