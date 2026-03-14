const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://lrlbygqbtylnrfsbgdkp.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybGJ5Z3FidHlsbnJmc2JnZGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ2NjUzMywiZXhwIjoyMDg0MDQyNTMzfQ.zt2gHaRsGQcbCHpHQtQG-7u16faAOw398VZs5Ty6uUk";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function processSermons() {
  console.log("Fetching sermons...");
  const { data, error } = await supabase.from("sermons").select("*");
  if (error) {
    console.error("Error fetching:", error);
    return;
  }

  const sermons = data;
  console.log(`Found ${sermons.length} sermons`);

  // Use the category already assigned to each sermon (from Cloudflare folder structure)
  // and update Supabase accordingly.
  // Assumes each sermon object has a 'category' field set to 'friday', 'sunday', 'tuesday', or 'other'.

  console.log("Updating sermons using existing categories...");
  for (const sermon of sermons) {
    if (!sermon.category) {
      console.warn(`Skipping sermon with missing category: ${sermon.id}`);
      continue;
    }
    const { error: updateError } = await supabase
      .from("sermons")
      .update({ messagetype: sermon.category, category: sermon.category })
      .eq("id", sermon.id);
    if (updateError) {
      console.error(`Error updating ${sermon.id}:`, updateError);
    } else {
      console.log(`Updated ${sermon.id}: ${sermon.category}`);
    }
  }

  console.log("Processing complete!");
}

processSermons().catch(console.error);
