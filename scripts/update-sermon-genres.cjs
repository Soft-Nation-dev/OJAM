const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = "https://lrlbygqbtylnrfsbgdkp.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybGJ5Z3FidHlsbnJmc2JnZGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ2NjUzMywiZXhwIjoyMDg0MDQyNTMzfQ.zt2gHaRsGQcbCHpHQtQG-7u16faAOw398VZs5Ty6uUk";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// List of possible genres (customize as needed)
const GENRES = [
  "Teaching",
  "Worship",
  "Prayer",
  "Evangelism",
  "Breakthrough",
  "Fellowship",
  "Commanding",
  "Declaration",
  "Exam",
  "Goodness",
  "Imagination",
  "Year",
  "See",
  "Save",
  "Power",
  "Power",
  "Healing",
  "Fasting",
  "Prophecy",
  "Testimony",
  "Deliverance",
  "Thanksgiving",
  "Youth",
  "Children",
  "Marriage",
  "Leadership",
  "Faith",
  "Holy Spirit",
  "Revival",
  "General",
];

function detectGenre(title) {
  const text = title.toLowerCase();
  for (const genre of GENRES) {
    if (text.includes(genre.toLowerCase())) {
      return genre;
    }
  }
  return "General";
}

async function updateGenres() {
  console.log("Fetching sermons...");
  const { data: sermons, error } = await supabase
    .from("sermons")
    .select("id, title, genre");
  if (error) {
    console.error("Error fetching sermons:", error);
    return;
  }

  let updated = 0;
  for (const sermon of sermons) {
    const detected = detectGenre(sermon.title);
    if (sermon.genre !== detected) {
      const { error: updateError } = await supabase
        .from("sermons")
        .update({ genre: detected })
        .eq("id", sermon.id);
      if (updateError) {
        console.error(`Error updating genre for ${sermon.id}:`, updateError);
      } else {
        updated++;
        console.log(`Updated ${sermon.id}: ${detected}`);
      }
    }
  }
  console.log(`Genre update complete. Updated ${updated} sermons.`);
}

updateGenres().catch(console.error);
