const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function assignRandomImagesToAll() {
  const { data: images, error: imagesError } = await supabase
    .from("images")
    .select("image_key");

  if (imagesError) {
    console.error("Error fetching images:", imagesError);
    process.exit(1);
  }

  if (!images || images.length === 0) {
    console.error("No images found in public.images.");
    process.exit(1);
  }

  const { data: sermons, error: sermonsError } = await supabase
    .from("sermons")
    .select("id");

  if (sermonsError) {
    console.error("Error fetching sermons:", sermonsError);
    process.exit(1);
  }

  const { data: playlists, error: playlistsError } = await supabase
    .from("playlists")
    .select("id");

  if (playlistsError) {
    console.error("Error fetching playlists:", playlistsError);
    process.exit(1);
  }

  let sermonsUpdated = 0;
  let playlistsUpdated = 0;

  for (const sermon of sermons || []) {
    const randomImage = images[Math.floor(Math.random() * images.length)];
    const { error: updateError } = await supabase
      .from("sermons")
      .update({ image_key: randomImage.image_key })
      .eq("id", sermon.id);

    if (updateError) {
      console.error(`Failed to update sermon ${sermon.id}:`, updateError);
      continue;
    }

    sermonsUpdated++;
  }

  for (const playlist of playlists || []) {
    const randomImage = images[Math.floor(Math.random() * images.length)];
    const { error: updateError } = await supabase
      .from("playlists")
      .update({ image_key: randomImage.image_key })
      .eq("id", playlist.id);

    if (updateError) {
      console.error(`Failed to update playlist ${playlist.id}:`, updateError);
      continue;
    }

    playlistsUpdated++;
  }

  console.log(
    `Assigned images to ${sermonsUpdated} sermons and ${playlistsUpdated} playlists.`,
  );
}

assignRandomImagesToAll().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
