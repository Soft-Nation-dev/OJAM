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

  // Shuffle sermons for random assignment
  const shuffled = [...sermons].sort(() => Math.random() - 0.5);

  // Divide into 3 groups evenly: Tuesday, Friday, Sunday
  const groupSize = Math.floor(shuffled.length / 3);
  const tuesday = shuffled.slice(0, groupSize);
  const friday = shuffled.slice(groupSize, groupSize * 2);
  const sunday = shuffled.slice(groupSize * 2);

  console.log(
    `Groups: Tuesday: ${tuesday.length}, Friday: ${friday.length}, Sunday: ${sunday.length}`,
  );

  // Prepare updates: only allowed categories
  const updates = [];
  tuesday.forEach((s) =>
    updates.push({ id: s.id, messagetype: "tuesday", category: "tuesday" }),
  );
  friday.forEach((s) =>
    updates.push({ id: s.id, messagetype: "friday", category: "friday" }),
  );
  sunday.forEach((s) =>
    updates.push({ id: s.id, messagetype: "sunday", category: "sunday" }),
  );

  // Update database
  console.log("Updating sermons...");
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from("sermons")
      .update({ messagetype: update.messagetype, category: update.category })
      .eq("id", update.id);
    if (updateError) {
      console.error(`Error updating ${update.id}:`, updateError);
    } else {
      console.log(
        `Updated ${update.id}: ${update.messagetype}, ${update.category}`,
      );
    }
  }

  console.log("Processing complete!");
}

processSermons().catch(console.error);
