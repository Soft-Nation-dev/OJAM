export default {
	async fetch(request: Request, env: any) {
		const url = new URL(request.url);

		// ---------- CORS Preflight (OPTIONS) ----------
		// iOS Safari sends a preflight OPTIONS request before audio range requests.
		// Without handling it, audio streaming is completely blocked on iOS PWA.
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
					'Access-Control-Allow-Headers': 'Range, Content-Type',
					'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		// ---------- Helper Functions ----------
		const estimateDurationFromSize = (size?: number) => {
			if (!size) return 0;
			const estimatedBitrate = 128000; // 128 kbps
			return Math.round((size * 8) / estimatedBitrate);
		};

		const isAudioKey = (key: string) => /\.(mp3|m4a|wav|aac|ogg)$/i.test(key);
		const isImageKey = (key: string) => /\.(jpg|jpeg|png|webp)$/i.test(key);

		const getTitle = (key: string) =>
			key.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Untitled';

		const getContentType = (key: string) => {
			const lower = key.toLowerCase();
			if (lower.endsWith('.png')) return 'image/png';
			if (lower.endsWith('.webp')) return 'image/webp';
			if (lower.endsWith('.gif')) return 'image/gif';
			return 'image/jpeg'; // default
		};

		const getAudioType = (key: string) => {
			const lower = key.toLowerCase();
			if (lower.endsWith('.m4a')) return 'audio/mp4';
			if (lower.endsWith('.wav')) return 'audio/wav';
			if (lower.endsWith('.aac')) return 'audio/aac';
			if (lower.endsWith('.ogg')) return 'audio/ogg';
			return 'audio/mpeg';
		};

		// ---------- GET Routes (Media) ----------
		if (request.method === 'GET' || request.method === 'HEAD') {
			if (url.pathname === '/update-config') {
				// ⚠️  UPDATE THIS whenever you publish a new version to the Play Store.
				// latestVersion → triggers the "update available" prompt if the user's
				//                  installed version is lower.
				// minVersion    → triggers a FORCED update prompt if the user's installed
				//                  version is below this value.
				// Keep latestVersion = minVersion = your current Play Store version.
				const PLAY_STORE_VERSION = '2.2.0';

				const payload = {
					minVersion: PLAY_STORE_VERSION,
					latestVersion: PLAY_STORE_VERSION,
					storeUrl: 'https://play.google.com/store/apps/details?id=com.softnation.ojam',
				};

				return new Response(JSON.stringify(payload), {
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Cache-Control': 'public, max-age=300',
					},
				});
			}

			// NATIVE CLOUDFLARE R2 AUDIO STREAMING ENGINE
			if (url.pathname.startsWith('/audio/')) {
				const sermonsBucket = env.PROD_SERMONS;
				if (!sermonsBucket) return new Response('R2 Bucket PROD_SERMONS binding not found', { status: 500 });

				try {
					// 1. Strip out '/audio/' prefix and decode spaces cleanly
					// e.g., '/audio/friday/14-03-2025.mp3' -> 'friday/14-03-2025.mp3'
					const key = decodeURIComponent(url.pathname.slice('/audio/'.length));
					if (!key) return new Response('Audio object key required', { status: 400 });

					// 2. Parse incoming HTTP Range requests from Chrome / Safari
					const rangeHeader = request.headers.get('Range');
					let r2Options: any = {};
					
					if (rangeHeader) {
						const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
						if (rangeMatch) {
							r2Options.range = {
								offset: parseInt(rangeMatch[1], 10),
								length: rangeMatch[2] ? (parseInt(rangeMatch[2], 10) - parseInt(rangeMatch[1], 10) + 1) : undefined
							};
						}
					}

					// 3. Fetch object directly from internal R2 storage memory
					const obj = await sermonsBucket.get(key, r2Options);
					if (!obj) return new Response('Sermon file not found in R2 storage', { status: 404 });

					// 4. Construct response headers dynamically based on full vs partial delivery
					const audioHeaders = new Headers();
					audioHeaders.set('Content-Type', getAudioType(key));
					audioHeaders.set('Accept-Ranges', 'bytes');
					audioHeaders.set('Access-Control-Allow-Origin', '*');
					audioHeaders.set('Cache-Control', 'public, max-age=31536000');

					if (obj.size) {
						audioHeaders.set('Content-Length', String(obj.size));
					}

					// Handle partial stream responses (HTTP 206) for timeline seeking
					let responseStatus = 200;
					if (rangeHeader && obj.range) {
						responseStatus = 206;
						// Format example: bytes 0-1023/2048576
						const totalSize = (obj as any).size || '*'; 
						audioHeaders.set('Content-Range', `bytes ${obj.range.offset}-${obj.range.offset + obj.range.length - 1}/${totalSize}`);
					}

					if (request.method === 'HEAD') {
						return new Response(null, { status: responseStatus, headers: audioHeaders });
					}

					return new Response(obj.body, { status: responseStatus, headers: audioHeaders });

				} catch (err: any) {
					return new Response(`R2 Stream Error: ${err.message}`, { status: 500 });
				}
			}

			// Serve image files
			if (url.pathname.startsWith('/images/')) {
				const key = decodeURIComponent(url.pathname.slice('/images/'.length));
				if (!key) return new Response('Key required', { status: 400 });
				const imagesBucket = env.PROD_IMAGES;
				if (!imagesBucket) return new Response('Bucket not found', { status: 500 });
				try {
					const obj = await imagesBucket.get(key);
					if (!obj) return new Response('Not found', { status: 404 });

					const imgHeaders: Record<string, string> = {
						'Content-Type': getContentType(key),
						'Cache-Control': 'public, max-age=31536000',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type',
						'Access-Control-Expose-Headers': 'Content-Length',
					};
					if (obj.size) imgHeaders['Content-Length'] = String(obj.size);

					if (request.method === 'HEAD') {
						return new Response(null, { headers: imgHeaders });
					}

					return new Response(obj.body, { headers: imgHeaders });
				} catch (err: any) {
					return new Response(`Error: ${err.message}`, { status: 500 });
				}
			}

			return new Response('Not found', { status: 404 });
		}

		// ---------- POST /sync (Optimized) ----------
		if (request.method === 'POST' && url.pathname === '/sync') {
			const SECRET = 'RUN-ONCE-COPY';
			if (request.headers.get('x-sync-secret') !== SECRET) {
				return new Response('Unauthorized', { status: 401 });
			}

			const sermonsBucket = env.PROD_SERMONS;
			const imagesBucket = env.PROD_IMAGES;
			if (!sermonsBucket || !imagesBucket) {
				return new Response('Missing R2 bindings', { status: 500 });
			}

			try {
				console.log("🚀 Starting optimized sync...");

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

				// ----------------- Fetch Supabase -----------------
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

				if (!sermonsRes.ok || !imagesRes.ok) throw new Error("Failed to fetch Supabase data");

				const existingSermons = new Set((await sermonsRes.json()).map((s: any) => s.audio_key));
				const existingImages = new Set((await imagesRes.json()).map((i: any) => i.image_key));

				// ----------------- Sync Images -----------------
				const allImageObjects = (await listAllObjects(imagesBucket)).filter(isImageKey);
				const newImages: string[] = [];

				for (const img of allImageObjects) {
					if (!existingImages.has(img.key)) {
						const res = await fetch(`${env.SUPABASE_URL}/rest/v1/images?on_conflict=image_key`, {
							method: "POST",
							headers: {
								apikey: env.SUPABASE_SERVICE_ROLE_KEY,
								Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({ image_key: img.key }),
						});
						if (res.ok) newImages.push(img.key);
					}
				}

				const allImages = [...newImages, ...Array.from(existingImages)];
				if (allImages.length === 0) throw new Error("No images available");

				// ----------------- Sync Sermons -----------------
				const allAudioObjects = (await listAllObjects(sermonsBucket)).filter(isAudioKey);
				const newSermons = allAudioObjects.filter(obj => !existingSermons.has(obj.key));

				// Batch upload new sermons
				const uploadPromises = newSermons.map(obj => {
					const audioKey = obj.key;
					const randomImage = allImages[Math.floor(Math.random() * allImages.length)];
					const duration = estimateDurationFromSize(obj.size);

					return fetch(`${env.SUPABASE_URL}/rest/v1/sermons?on_conflict=audio_key`, {
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
					}).then(res => {
						if (!res.ok) console.error(`❌ Failed to sync sermon ${audioKey}: ${res.status}`);
					});
				});

				await Promise.all(uploadPromises);

				console.log(`🎉 Optimized sync complete. Added ${newSermons.length} sermons, ${newImages.length} images.`);

				return new Response(JSON.stringify({
					new_sermons: newSermons.length,
					new_images: newImages.length,
				}), { headers: { "Content-Type": "application/json" } });

			} catch (err: any) {
				console.error("💥 Sync failed:", err.message);
				return new Response(`Error: ${err.message}`, { status: 500 });
			}
		}

		return new Response('Use GET for media or POST /sync to sync', { status: 405 })
	}
};