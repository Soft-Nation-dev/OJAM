/**
 * Web stub for track-player service.
 *
 * Metro automatically resolves *.web.ts files over *.ts when bundling
 * for the web platform. This file replaces the native implementation
 * of track-player.ts so that react-native-track-player (which is native-only
 * and has broken web modules) is never imported during web exports.
 */

export const isTrackPlayerSupported = false;

export function getTrackPlayerModule(): null {
  return null;
}

export async function initializeTrackPlayer(): Promise<void> {
  return Promise.resolve();
}
