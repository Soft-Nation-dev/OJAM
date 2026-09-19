import { supabase, WORKER_URL } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { Platform } from "react-native";

const AUDIO_PATTERN = /\.(mp3|m4a|wav|aac|ogg)$/i;
const PART_SIZE = 5 * 1024 * 1024;
const PENDING_UPLOAD_KEY = "@admin_pending_sermon_upload";

type UploadedPart = { partNumber: number; etag: string };
type UploadStart = { key: string; uploadId: string };

export type SermonUploadMetadata = {
  title: string;
  preacher: string;
  date: string;
  category: "sunday" | "tuesday" | "friday" | "other";
  genre: string;
  imageKey: string;
};

export type SermonUploadStage =
  | "preparing"
  | "uploading"
  | "processing"
  | "published";

export type SermonUploadProgress = {
  stage: SermonUploadStage;
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
  partNumber: number;
  totalParts: number;
};

export type PendingSermonUpload = {
  asset: Pick<DocumentPicker.DocumentPickerAsset, "uri" | "name" | "size" | "mimeType">;
  metadata: SermonUploadMetadata;
  key: string;
  uploadId: string;
  parts: UploadedPart[];
};

type UploadOptions = {
  metadata: SermonUploadMetadata;
  onProgress?: (progress: SermonUploadProgress) => void;
  signal?: AbortSignal;
  resume?: PendingSermonUpload | null;
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

const report = (
  options: UploadOptions,
  progress: SermonUploadProgress,
) => options.onProgress?.(progress);

export function titleFromAudioFile(name: string) {
  return name
    .replace(AUDIO_PATTERN, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  if (!asset.size) throw new Error("The selected audio file is empty.");
  return asset;
}

export async function getPendingSermonUpload() {
  if (Platform.OS === "web") return null;
  try {
    const value = await AsyncStorage.getItem(PENDING_UPLOAD_KEY);
    return value ? (JSON.parse(value) as PendingSermonUpload) : null;
  } catch {
    return null;
  }
}

export async function clearPendingSermonUpload() {
  await AsyncStorage.removeItem(PENDING_UPLOAD_KEY).catch(() => {});
}

const persistPending = async (pending: PendingSermonUpload) => {
  if (Platform.OS === "web") return;
  await AsyncStorage.setItem(PENDING_UPLOAD_KEY, JSON.stringify(pending)).catch(
    () => {},
  );
};

export async function uploadSermonAudio(
  asset: DocumentPicker.DocumentPickerAsset,
  options: UploadOptions,
) {
  const accessToken = await getAccessToken();
  const webFile = Platform.OS === "web" ? asset.file : null;
  const nativeFile = Platform.OS === "web" ? null : new ExpoFile(asset.uri);
  const fileSize = asset.size ?? webFile?.size ?? nativeFile?.size ?? 0;
  if (!fileSize) throw new Error("The selected audio file is empty.");

  const totalParts = Math.ceil(fileSize / PART_SIZE);
  report(options, {
    stage: "preparing",
    percent: 0,
    uploadedBytes: 0,
    totalBytes: fileSize,
    partNumber: 0,
    totalParts,
  });

  const authorization = { Authorization: `Bearer ${accessToken}` };
  let upload: UploadStart;
  let parts: UploadedPart[];

  if (options.resume) {
    upload = { key: options.resume.key, uploadId: options.resume.uploadId };
    parts = [...options.resume.parts];
  } else {
    const startResponse = await expoFetch(
      `${WORKER_URL}/admin/audio-upload/start`,
      {
        method: "POST",
        headers: { ...authorization, "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: asset.name,
          contentType: asset.mimeType || "application/octet-stream",
          category: options.metadata.category,
        }),
        signal: options.signal,
      },
    );
    upload = (await readJson(startResponse)) as UploadStart;
    parts = [];
  }

  const pending: PendingSermonUpload = {
    asset: {
      uri: asset.uri,
      name: asset.name,
      size: fileSize,
      mimeType: asset.mimeType,
    },
    metadata: options.metadata,
    key: upload.key,
    uploadId: upload.uploadId,
    parts,
  };
  await persistPending(pending);

  const nativeHandle = nativeFile?.open() ?? null;

  try {
    const completedPartNumbers = new Set(parts.map((part) => part.partNumber));
    for (let start = 0, partNumber = 1; start < fileSize; start += PART_SIZE, partNumber += 1) {
      const end = Math.min(start + PART_SIZE, fileSize);
      if (completedPartNumbers.has(partNumber)) continue;

      report(options, {
        stage: "uploading",
        percent: Math.round((start / fileSize) * 95),
        uploadedBytes: start,
        totalBytes: fileSize,
        partNumber,
        totalParts,
      });

      let chunk: Blob | Uint8Array;
      if (webFile) {
        chunk = webFile.slice(
          start,
          end,
          asset.mimeType || "application/octet-stream",
        );
      } else if (nativeHandle) {
        nativeHandle.offset = start;
        chunk = nativeHandle.readBytes(end - start);
      } else {
        throw new Error("The selected audio file could not be opened.");
      }
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
        body: chunk as BodyInit,
        signal: options.signal,
      });
      parts.push((await readJson(partResponse)) as UploadedPart);
      pending.parts = parts;
      await persistPending(pending);
      report(options, {
        stage: "uploading",
        percent: Math.round((end / fileSize) * 95),
        uploadedBytes: end,
        totalBytes: fileSize,
        partNumber,
        totalParts,
      });
    }

    report(options, {
      stage: "processing",
      percent: 97,
      uploadedBytes: fileSize,
      totalBytes: fileSize,
      partNumber: totalParts,
      totalParts,
    });
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
          metadata: options.metadata,
        }),
        signal: options.signal,
      },
    );
    const completed = await readJson(completeResponse);
    await clearPendingSermonUpload();
    report(options, {
      stage: "published",
      percent: 100,
      uploadedBytes: fileSize,
      totalBytes: fileSize,
      partNumber: totalParts,
      totalParts,
    });
    return completed;
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      const abortUrl = new URL(`${WORKER_URL}/admin/audio-upload`);
      abortUrl.searchParams.set("key", upload.key);
      abortUrl.searchParams.set("uploadId", upload.uploadId);
      await expoFetch(abortUrl.toString(), {
        method: "DELETE",
        headers: authorization,
      }).catch(() => {});
      await clearPendingSermonUpload();
    }
    throw error;
  } finally {
    nativeHandle?.close();
  }
}
