export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    const SECRET = 'RUN-ONCE-COPY';

    if (request.headers.get('x-sync-secret') !== SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const sermonsBucket = env.PROD_SERMONS;
    const imagesBucket = env.PROD_IMAGES; // ✅ your actual bucket name

    if (!sermonsBucket || !imagesBucket) {
      return new Response('Missing R2 bindings', { status: 500 });
    }

    const estimateDurationFromSize = (size?: number) => {
      if (!size) return 0;
      return Math.round((size * 8) / 128000);
    };

    const isAudioKey = (key: string) =>
      /\.(mp3|m4a|wav|aac|ogg)$/i.test(key);

    const isImageKey = (key: string) =>
      /\.(jpg|jpeg|png|webp)$/i.test(key);

    const getTitle = (key: string) =>
      key.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Untitled';

    // ✅ paginate R2 properly
    const listAllObjects = async (bucket: any) => {
      let cursor;
      const objects: any[] = [];

      do {
        const res = await bucket.list({ cursor, limit: 1000 });
        objects.push(...(res.objects || []));
        cursor = res.truncated ? res.cursor : undefined;
      } while (cursor);

      return objects;
    };

    try {
      console.log("🚀 Starting sync...");

      // =========================
      // 1️⃣ FETCH EXISTING DATA
      // =========================

      const [sermonsRes, imagesRes] = await Promise.all([
        fetch(`${env.SUPABASE_URL}/rest/v1/sermons?select=audio_key`, {
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }),
        fetch(`${env.SUPABASE_URL}/rest/v1/images?select=image_key`, {
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }),
      ]);

      if (!sermonsRes.ok || !imagesRes.ok) {
        throw new Error("Failed to fetch existing Supabase data");
      }

      const existingSermons = new Set(
        (await sermonsRes.json()).map((s: any) => s.audio_key)
      );

      const existingImages = new Set(
        (await imagesRes.json()).map((i: any) => i.image_key)
      );

      // =========================
      // 2️⃣ SYNC IMAGES FIRST
      // =========================

      const allImageObjects = (await listAllObjects(imagesBucket))
        .filter((obj) => isImageKey(obj.key))
        .sort((a, b) => (b.uploaded || 0) - (a.uploaded || 0)); // ✅ newest first

      let newImages: string[] = [];

      for (const img of allImageObjects) {
        if (existingImages.has(img.key)) continue;

        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/images`, {
          method: "POST",
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image_key: img.key }),
        });

        if (res.ok) {
          console.log("🖼️ Added image:", img.key);
          newImages.push(img.key);
        } else {
          console.error("❌ Failed image:", img.key);
        }
      }

      console.log(`✅ Image sync done. Added ${newImages.length}`);

      // combine new + old images (prioritize new ones)
      const allImages = [
        ...newImages,
        ...Array.from(existingImages),
      ];

      if (allImages.length === 0) {
        throw new Error("No images available");
      }

      // =========================
      // 3️⃣ SYNC AUDIO (ONLY NEW)
      // =========================

      const allAudioObjects = (await listAllObjects(sermonsBucket))
        .filter((obj) => isAudioKey(obj.key))
        .sort((a, b) => a.key.localeCompare(b.key)); // stable

      const newAudio = allAudioObjects.filter(
        (obj) => !existingSermons.has(obj.key)
      );

      if (newAudio.length === 0) {
        console.log("✅ No new sermons");
        return new Response("No new sermons to sync.");
      }

      console.log(`🎧 Found ${newAudio.length} new sermons`);

      // =========================
      // 4️⃣ INSERT WITH CHUNKING
      // =========================

      const chunkSize = 20;
      let inserted = 0;

      for (let i = 0; i < newAudio.length; i += chunkSize) {
        const chunk = newAudio.slice(i, i + chunkSize);

        await Promise.all(
          chunk.map(async (obj) => {
            try {
              const audioKey = obj.key;

              // 🎯 bias toward newest images
              const imagePool = allImages.slice(0, 20); // top 20 newest
              const randomImage =
                imagePool[Math.floor(Math.random() * imagePool.length)];

              const duration = estimateDurationFromSize(obj.size);

              const res = await fetch(`${env.SUPABASE_URL}/rest/v1/sermons`, {
                method: "POST",
                headers: {
                  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  title: getTitle(audioKey),
                  audio_key: audioKey,
                  image_key: randomImage,
                  preacher: null,
                  date: new Date().toISOString(),
                  duration,
                  category: audioKey.split('/')[0] || 'other',
                }),
              });

              if (res.ok) {
                inserted++;
                console.log("✅ Added sermon:", audioKey);
              } else {
                console.error("❌ Failed sermon:", audioKey);
              }
            } catch (err) {
              console.error("🔥 Error:", obj.key, err);
            }
          })
        );
      }

      console.log(`🎉 Sync complete. Inserted ${inserted}`);

      return new Response(
        JSON.stringify({
          new_sermons: inserted,
          new_images: newImages.length,
        }),
        { headers: { "Content-Type": "application/json" } }
      );

    } catch (err: any) {
      console.error("💥 Sync failed:", err.message);
      return new Response(`Error: ${err.message}`, { status: 500 });
    }
  },
};