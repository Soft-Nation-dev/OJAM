export default {
	async fetch(request: Request, env: any) {
		const url = new URL(request.url);
		const DEFAULT_CATEGORIES = ['sunday', 'tuesday', 'friday'];

		const estimateDurationFromSize = (size?: number) => {
			if (!size || size <= 0) return 0;
			const estimatedBitrate = 128000;
			return Math.round((size * 8) / estimatedBitrate);
		};

		const isAudioKey = (key: string) => {
			const lower = key.toLowerCase();
			return lower.endsWith('.mp3') || lower.endsWith('.m4a') || lower.endsWith('.wav') || lower.endsWith('.aac') || lower.endsWith('.ogg');
		};

		const isImageKey = (key: string) => {
			const lower = key.toLowerCase();
			return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
		};

		const getContentType = (key: string) => {
			const lower = key.toLowerCase();
			if (lower.endsWith('.png')) return 'image/png';
			if (lower.endsWith('.webp')) return 'image/webp';
			if (lower.endsWith('.gif')) return 'image/gif';
			return 'image/jpeg'; // Default to JPEG
		};

		const getBaseName = (key: string) => {
			const parts = key.split('/');
			return parts[parts.length - 1] || key;
		};

		const getTitleFromKey = (key: string) => {
			const base = getBaseName(key);
			return (
				base
					.replace(/\.[^.]+$/, '')
					.replace(/[-_]/g, ' ')
					.trim() || 'Untitled'
			);
		};

		const listAllObjects = async (bucket: any) => {
			let cursor: string | undefined;
			const objects: { key: string; size?: number }[] = [];
			do {
				const list = await bucket.list({ cursor, limit: 1000 });
				objects.push(...(list.objects || []));
				cursor = list.truncated ? list.cursor : undefined;
			} while (cursor);
			return objects;
		};

		if (request.method === 'GET') {
			// Handle audio requests
			if (url.pathname.startsWith('/audio/')) {
				const key = decodeURIComponent(url.pathname.slice('/audio/'.length));
				if (!key) return new Response('Key required', { status: 400 });

				const sermonsBucket = env.PROD_SERMONS;
				if (!sermonsBucket) return new Response('Bucket not found', { status: 500 });

				try {
					const object = await sermonsBucket.get(key);
					if (!object) return new Response('Not found', { status: 404 });

					return new Response(object.body, {
						headers: {
							'Content-Type': 'audio/mpeg',
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

			// Handle image requests
			if (url.pathname.startsWith('/images/')) {
				const key = decodeURIComponent(url.pathname.slice('/images/'.length));
				if (!key) return new Response('Key required', { status: 400 });

				const imagesBucket = env.PROD_IMAGES;
				if (!imagesBucket) return new Response('Bucket not found', { status: 500 });

				try {
					const object = await imagesBucket.get(key);
					if (!object) return new Response('Not found', { status: 404 });

					// Determine content type based on file extension
					const contentType = getContentType(key);

					return new Response(object.body, {
						headers: {
							'Content-Type': contentType,
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

		// Only allow POST requests for sync
		if (request.method !== 'POST') {
			return new Response('Use POST for sync or GET for media', { status: 405 });
		}

		// Categorize audio files in R2 and seed Supabase metadata
		if (url.pathname === '/categorize-audio') {
			// Batch processing: get batch index from query param
			const batchSize = 40;
			const batchIndex = parseInt(url.searchParams.get('batch') || '0', 10);
			const SECRET = 'RUN-ONCE-COPY';
			if (request.headers.get('x-sync-secret') !== SECRET) {
				return new Response('Unauthorized', { status: 401 });
			}

			const sermonsBucket = env.PROD_SERMONS;
			if (!sermonsBucket) {
				return new Response('R2 bucket bindings not found!', { status: 500 });
			}

			let body: any = {};
			try {
				body = await request.json();
			} catch {
				body = {};
			}

			const categories = Array.isArray(body.categories) && body.categories.length > 0 ? body.categories : DEFAULT_CATEGORIES;
			const dryRun = body.dryRun === true;
			const moveObjects = body.moveObjects !== false;

			const allObjects = await listAllObjects(sermonsBucket);
			const audioObjects = allObjects.filter((obj) => isAudioKey(obj.key));
			const totalBatches = Math.ceil(audioObjects.length / batchSize);
			const batchStart = batchIndex * batchSize;
			const batchEnd = batchStart + batchSize;
			const batchObjects = audioObjects.slice(batchStart, batchEnd);

			let moved = 0;
			let updated = 0;
			let skipped = 0;

			for (let i = 0; i < batchObjects.length; i++) {
				const obj = batchObjects[i];
				const globalIndex = batchStart + i;
				const key = obj.key;
				const hasPrefix = categories.some((cat: string) => key.startsWith(`${cat}/`));
				const category = hasPrefix ? key.split('/')[0] : categories[globalIndex % categories.length];
				let newKey = key;

				if (!hasPrefix && moveObjects) {
					newKey = `${category}/${getBaseName(key)}`;
				}

				if (!dryRun && !hasPrefix && moveObjects) {
					const object = await sermonsBucket.get(key);
					if (!object) {
						skipped++;
						continue;
					}
					await sermonsBucket.put(newKey, object.body, {
						httpMetadata: object.httpMetadata,
						customMetadata: object.customMetadata,
					});
					await sermonsBucket.delete(key);
					moved++;
				}

				if (!dryRun) {
					const duration = estimateDurationFromSize(obj.size);
					const title = getTitleFromKey(newKey);
					const res = await fetch(`${env.SUPABASE_URL}/rest/v1/sermons?on_conflict=audio_key`, {
						method: 'POST',
						headers: {
							apikey: env.SUPABASE_SERVICE_ROLE_KEY,
							Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
							'Content-Type': 'application/json',
							Prefer: 'resolution=merge-duplicates',
						},
						body: JSON.stringify({
							title,
							audio_key: newKey,
							preacher: null,
							date: new Date().toISOString(),
							duration,
							category,
						}),
					});
					if (res.ok) {
						updated++;
					} else {
						console.error(`Failed to upsert sermon ${newKey}: ${res.status}`);
					}
				}
			}

			return new Response(
				JSON.stringify({
					total: audioObjects.length,
					batch: batchIndex,
					totalBatches,
					processed: batchObjects.length,
					moved,
					updated,
					skipped,
					dryRun,
					nextBatch: batchIndex + 1 < totalBatches ? batchIndex + 1 : null,
				}),
				{
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				},
			);
		}

		// Import image metadata from R2 into Supabase
		if (url.pathname === '/sync-images') {
			const SECRET = 'RUN-ONCE-COPY';
			if (request.headers.get('x-sync-secret') !== SECRET) {
				return new Response('Unauthorized', { status: 401 });
			}

			const imagesBucket = env.PROD_IMAGES;
			if (!imagesBucket) {
				return new Response('R2 bucket bindings not found!', { status: 500 });
			}

			let body: any = {};
			try {
				body = await request.json();
			} catch {
				body = {};
			}

			const dryRun = body.dryRun === true;

			const allObjects = await listAllObjects(imagesBucket);
			const imageObjects = allObjects.filter((obj) => isImageKey(obj.key));

			let updated = 0;
			let skipped = 0;

			for (const obj of imageObjects) {
				if (dryRun) continue;

				const res = await fetch(`${env.SUPABASE_URL}/rest/v1/images?on_conflict=image_key`, {
					method: 'POST',
					headers: {
						apikey: env.SUPABASE_SERVICE_ROLE_KEY,
						Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
						'Content-Type': 'application/json',
						Prefer: 'resolution=merge-duplicates',
					},
					body: JSON.stringify({
						image_key: obj.key,
					}),
				});

				if (res.ok) {
					updated++;
				} else {
					skipped++;
					console.error(`Failed to upsert image ${obj.key}: ${res.status}`);
				}
			}

			return new Response(
				JSON.stringify({
					total: imageObjects.length,
					updated,
					skipped,
					dryRun,
				}),
				{
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				},
			);
		}

		// Check if this is a duration update request
		if (url.pathname === '/update-durations') {
			const SECRET = 'RUN-ONCE-COPY';
			if (request.headers.get('x-sync-secret') !== SECRET) {
				return new Response('Unauthorized', { status: 401 });
			}

			const sermonsBucket = env.PROD_SERMONS;
			if (!sermonsBucket) {
				return new Response('R2 bucket bindings not found!', { status: 500 });
			}

			try {
				// Fetch all sermons from Supabase
				const sermonsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/sermons?select=id,audio_key,duration`, {
					headers: {
						apikey: env.SUPABASE_SERVICE_ROLE_KEY,
						Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
					},
				});
				if (!sermonsRes.ok) throw new Error(`Failed to fetch sermons: ${sermonsRes.status}`);
				const sermons: { id: string; audio_key: string; duration: number | null }[] = await sermonsRes.json();

				// Filter sermons that need duration updates (null or 0)
				const sermonsToUpdate = sermons.filter((s) => !s.duration || s.duration === 0);

				if (sermonsToUpdate.length === 0) {
					return new Response('No sermons need duration updates.');
				}

				// Calculate and update durations
				let updated = 0;
				await Promise.all(
					sermonsToUpdate.map(async (sermon) => {
						try {
							const audioObject = await sermonsBucket.get(sermon.audio_key);
							if (!audioObject || !audioObject.size) {
								console.warn(`Audio file not found for ${sermon.audio_key}`);
								return;
							}

							const duration = estimateDurationFromSize(audioObject.size);

							// Update Supabase
							const updateRes = await fetch(`${env.SUPABASE_URL}/rest/v1/sermons?id=eq.${sermon.id}`, {
								method: 'PATCH',
								headers: {
									apikey: env.SUPABASE_SERVICE_ROLE_KEY,
									Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({ duration }),
							});

							if (updateRes.ok) {
								updated++;
							} else {
								console.error(`Failed to update sermon ${sermon.id}: ${updateRes.status}`);
							}
						} catch (err) {
							console.error(`Error updating duration for sermon ${sermon.id}:`, err);
						}
					}),
				);

				return new Response(`Duration update complete. Updated ${updated} out of ${sermonsToUpdate.length} sermons.`);
			} catch (err: any) {
				return new Response(`Error updating durations: ${err.message}`, { status: 500 });
			}
		}

		// Assign random images to playlists
		if (url.pathname === '/assign-images-to-playlists') {
			const SECRET = 'RUN-ONCE-COPY';
			if (request.headers.get('x-sync-secret') !== SECRET) {
				return new Response('Unauthorized', { status: 401 });
			}

			try {
				// Fetch all images
				const imagesRes = await fetch(`${env.SUPABASE_URL}/rest/v1/images?select=image_key`, {
					headers: {
						apikey: env.SUPABASE_SERVICE_ROLE_KEY,
						Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
					},
				});
				if (!imagesRes.ok) throw new Error(`Failed to fetch images: ${imagesRes.status}`);
				const images: { image_key: string }[] = await imagesRes.json();
				if (images.length === 0) {
					return new Response('No images found in public.images', { status: 400 });
				}

				// Fetch all playlists
				const playlistsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/playlists?select=id`, {
					headers: {
						apikey: env.SUPABASE_SERVICE_ROLE_KEY,
						Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
					},
				});
				if (!playlistsRes.ok) throw new Error(`Failed to fetch playlists: ${playlistsRes.status}`);
				const playlists: { id: string }[] = await playlistsRes.json();
				if (playlists.length === 0) {
					return new Response('No playlists found', { status: 400 });
				}

				// Assign random images to each playlist
				let updated = 0;
				await Promise.all(
					playlists.map(async (playlist) => {
						const randomImage = images[Math.floor(Math.random() * images.length)].image_key;
						const updateRes = await fetch(`${env.SUPABASE_URL}/rest/v1/playlists?id=eq.${playlist.id}`, {
							method: 'PATCH',
							headers: {
								apikey: env.SUPABASE_SERVICE_ROLE_KEY,
								Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({ image_key: randomImage }),
						});
						if (updateRes.ok) {
							updated++;
						} else {
							console.error(`Failed to update playlist ${playlist.id}: ${updateRes.status}`);
						}
					}),
				);

				return new Response(
					JSON.stringify({
						playlists: playlists.length,
						updated,
						images: images.length,
					}),
					{
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
						},
					},
				);
			} catch (err: any) {
				return new Response(`Error assigning images to playlists: ${err.message}`, { status: 500 });
			}
		}

		// Safety secret
		const SECRET = 'RUN-ONCE-COPY';
		if (request.headers.get('x-sync-secret') !== SECRET) {
			return new Response('Unauthorized', { status: 401 });
		}

		const sermonsBucket = env.PROD_SERMONS;
		const imagesBucket = env.PROD_IMAGES;

		if (!sermonsBucket || !imagesBucket) {
			return new Response('R2 bucket bindings not found!', { status: 500 });
		}

		try {
			// 1️⃣ Fetch existing sermons from Supabase
			const existingRes = await fetch(`${env.SUPABASE_URL}/rest/v1/sermons?select=audio_key`, {
				headers: {
					apikey: env.SUPABASE_SERVICE_ROLE_KEY,
					Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
				},
			});
			if (!existingRes.ok) throw new Error(`Failed to fetch existing sermons: ${existingRes.status}`);
			const existing: { audio_key: string }[] = await existingRes.json();
			const existingKeys = new Set(existing.map((s) => s.audio_key));

			// 2️⃣ Fetch images from Supabase
			const imagesRes = await fetch(`${env.SUPABASE_URL}/rest/v1/images?select=image_key`, {
				headers: {
					apikey: env.SUPABASE_SERVICE_ROLE_KEY,
					Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
				},
			});
			if (!imagesRes.ok) throw new Error(`Failed to fetch images: ${imagesRes.status}`);
			let images: { image_key: string }[] = await imagesRes.json();
			if (images.length === 0) images = [{ image_key: 'default.jpg' }];

			// 3️⃣ List sermons from R2 bucket
			const list = await sermonsBucket.list();
			const allFiles = list.objects || [];

			// Filter files not in Supabase
			const newFiles = allFiles.filter((obj) => !existingKeys.has(obj.key));
			if (newFiles.length === 0) return new Response('No new sermons to sync.');

			// 4️⃣ Upload new sermons to Supabase
			await Promise.all(
				newFiles.map(async (obj) => {
					const audioKey = obj.key;
					const randomImage = images[Math.floor(Math.random() * images.length)].image_key;
					const title = audioKey.split('/').pop()?.replace('.mp3', '').replace(/[-_]/g, ' ') || 'Untitled';

					// Calculate duration from the audio file
					let duration = 0;
					try {
						const audioObject = await sermonsBucket.get(audioKey);
						if (audioObject && audioObject.size) {
							duration = estimateDurationFromSize(audioObject.size);
						}
					} catch (err) {
						console.warn(`Could not calculate duration for ${audioKey}:`, err);
						duration = 0;
					}

					const res = await fetch(`${env.SUPABASE_URL}/rest/v1/sermons`, {
						method: 'POST',
						headers: {
							apikey: env.SUPABASE_SERVICE_ROLE_KEY,
							Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							title,
							audio_key: audioKey,
							image_key: randomImage,
							preacher: null,
							date: new Date().toISOString(),
							duration: duration,
							category: 'sunday',
						}),
					});
					if (!res.ok) console.error(`Failed to POST sermon ${audioKey}: ${res.status}`);
					return res;
				}),
			);

			return new Response(`Sermon sync complete. Added ${newFiles.length} new files.`);
		} catch (err: any) {
			return new Response(`Error syncing sermons: ${err.message}`, { status: 500 });
		}
	},
};
