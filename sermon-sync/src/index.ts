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

		const listAllObjects = async (bucket: any) => {
			let cursor;
			const objects: { key: string; size?: number }[] = [];
			do {
				const res = await bucket.list({ cursor, limit: 1000 });
				objects.push(...(res.objects || []));
				cursor = res.truncated ? res.cursor : undefined;
			} while (cursor);
			return objects;
		};

		const getAudioType = (key: string) => {
				const lower = key.toLowerCase();
				if (lower.endsWith('.m4a')) return 'audio/mp4';
				if (lower.endsWith('.wav')) return 'audio/wav';
				if (lower.endsWith('.aac')) return 'audio/aac';
				if (lower.endsWith('.ogg')) return 'audio/ogg';
				return 'audio/mpeg';
			};

		const buildAudioResponseInit = (obj: any, key: string) => {
			const headers = new Headers({
				'Content-Type': getAudioType(key),
				'Cache-Control': 'public, max-age=31536000',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
				'Access-Control-Allow-Headers': 'Range, Content-Type',
				'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
				'Accept-Ranges': 'bytes',
			});

			if (obj.size) {
				headers.set(
					'Content-Length',
					String(obj.range ? obj.range.end - obj.range.offset + 1 : obj.size),
				);
			}

			if (obj.range) {
				headers.set(
					'Content-Range',
					`bytes ${obj.range.offset}-${obj.range.end}/${obj.size}`,
				);
			}

			return {
				status: obj.range ? 206 : 200,
				headers,
			};
		};

		// ---------- GET Routes (Media) ----------
		if (request.method === 'GET' || request.method === 'HEAD') {
			if (url.pathname === '/update-config') {
				const payload = {
					minVersion: '2.0.0',
					latestVersion: '2.0.0',
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

			// Serve audio files
			if (url.pathname.startsWith('/audio/')) {
				const key = decodeURIComponent(url.pathname.slice('/audio/'.length));
				if (!key) return new Response('Key required', { status: 400 });

				const sermonsBucket = env.PROD_SERMONS;
				if (!sermonsBucket) {
					return new Response('Bucket not found', { status: 500 });
				}

				try {
					const range = request.headers.get('range');

					const obj = await sermonsBucket.get(
						key,
						range
							? {
									range: request.headers,
							}
							: undefined
					);	

					if (!obj) return new Response('Not found', { status: 404 });
					const init = buildAudioResponseInit(obj, key);

					if (request.method === 'HEAD') {
						return new Response(null, init);
					}

					return new Response(obj.body, init);
				} catch (err: any) {
					return new Response(`Error: ${err.message}`, { status: 500 });
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
								return new Response(obj.body, {
									headers: {
										'Content-Type': getContentType(key),
										'Cache-Control': 'public, max-age=31536000',
										'Access-Control-Allow-Origin': '*',
										'Access-Control-Allow-Methods': 'GET',
										'Access-Control-Allow-Headers': '*',
									},
								});
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

				// ----------------- Helpers -----------------
				const estimateDurationFromSize = (size?: number) => {
					if (!size || size <= 0) return 0;
					const estimatedBitrate = 128000; // bits per second
					return Math.round((size * 8) / estimatedBitrate);
				};

				const isAudioKey = (obj: any) => /\.(mp3|m4a|wav|aac|ogg)$/i.test(obj.key);
				const isImageKey = (obj: any) => /\.(jpg|jpeg|png|webp)$/i.test(obj.key);
				const getTitle = (key: string) =>
					key.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Untitled';

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