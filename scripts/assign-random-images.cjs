const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function assignRandomImages() {
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
    .select("id")
    .is("image_key", null);

  if (sermonsError) {
    console.error("Error fetching sermons:", sermonsError);
    process.exit(1);
  }

  if (!sermons || sermons.length === 0) {
    console.log("No sermons with null image_key.");
    return;
  }

  let updated = 0;
  for (const sermon of sermons) {
    const randomImage = images[Math.floor(Math.random() * images.length)];
    const { error: updateError } = await supabase
      .from("sermons")
      .update({ image_key: randomImage.image_key })
      .eq("id", sermon.id)
      .is("image_key", null);

    if (updateError) {
      console.error(`Failed to update sermon ${sermon.id}:`, updateError);
      continue;
    }

    updated++;
  }

  console.log(`Assigned images to ${updated} sermons.`);
}

assignRandomImages().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
