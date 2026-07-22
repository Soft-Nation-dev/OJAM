import { supabase, WORKER_URL } from "@/lib/supabase";
import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { Platform } from "react-native";

const AUDIO_PATTERN = /\.(mp3|m4a|wav|aac|ogg)$/i;
const PART_SIZE = 8 * 1024 * 1024;

type UploadedPart = { partNumber: number; etag: string };

type UploadStart = {
  key: string;
  uploadId: string;
};

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Your session has expired. Sign in again before uploading.");
  }
  return data.session.access_token;
}

async function readJson(response: {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
}) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `Upload request failed (${response.status})`);
  }
  return body;
}

function asBlob(asset: DocumentPicker.DocumentPickerAsset): Blob {
  if (Platform.OS === "web" && asset.file) return asset.file;
  return new ExpoFile(asset.uri);
}

export async function pickSermonAudio() {
  const result = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    multiple: false,
    copyToCacheDirectory: true,
    base64: false,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (!AUDIO_PATTERN.test(asset.name)) {
    throw new Error("Choose an MP3, M4A, WAV, AAC, or OGG audio file.");
  }
  return asset;
}

export async function uploadSermonAudio(
  asset: DocumentPicker.DocumentPickerAsset,
  onProgress?: (progress: number) => void,
) {
  const accessToken = await getAccessToken();
  const file = asBlob(asset);
  const fileSize = asset.size ?? file.size;
  if (!fileSize) throw new Error("The selected audio file is empty.");

  const authorization = { Authorization: `Bearer ${accessToken}` };
  const startResponse = await expoFetch(
    `${WORKER_URL}/admin/audio-upload/start`,
    {
      method: "POST",
      headers: { ...authorization, "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: asset.name,
        contentType: asset.mimeType || "application/octet-stream",
        category: "other",
      }),
    },
  );
  const upload = (await readJson(startResponse)) as UploadStart;
  const parts: UploadedPart[] = [];

  try {
    for (let start = 0, partNumber = 1; start < fileSize; start += PART_SIZE, partNumber += 1) {
      const end = Math.min(start + PART_SIZE, fileSize);
      const chunk = file.slice(start, end, asset.mimeType || "application/octet-stream");
      const partUrl = new URL(`${WORKER_URL}/admin/audio-upload/part`);
      partUrl.searchParams.set("key", upload.key);
      partUrl.searchParams.set("uploadId", upload.uploadId);
      partUrl.searchParams.set("partNumber", String(partNumber));

      const partResponse = await expoFetch(partUrl.toString(), {
        method: "PUT",
        headers: {
          ...authorization,
          "Content-Type": asset.mimeType || "application/octet-stream",
        },
        body: chunk,
      });
      parts.push((await readJson(partResponse)) as UploadedPart);
      onProgress?.(Math.round((end / fileSize) * 95));
    }

    const completeResponse = await expoFetch(
      `${WORKER_URL}/admin/audio-upload/complete`,
      {
        method: "POST",
        headers: { ...authorization, "Content-Type": "application/json" },
        body: JSON.stringify({
          key: upload.key,
          uploadId: upload.uploadId,
          parts,
          fileName: asset.name,
          fileSize,
        }),
      },
    );
    const completed = await readJson(completeResponse);
    onProgress?.(100);
    return completed;
  } catch (error) {
    const abortUrl = new URL(`${WORKER_URL}/admin/audio-upload`);
    abortUrl.searchParams.set("key", upload.key);
    abortUrl.searchParams.set("uploadId", upload.uploadId);
    await expoFetch(abortUrl.toString(), {
      method: "DELETE",
      headers: authorization,
    }).catch(() => {});
    throw error;
  }
}
