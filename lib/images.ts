import { supabase, WORKER_URL } from "@/lib/supabase";

export type PublicImage = {
  id: string;
  imageKey: string;
  imageUrl: string;
  createdAt: string;
};

const encodeR2Key = (key: string) =>
  key
    .split("/")
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");

export async function fetchImages(): Promise<PublicImage[]> {
  const { data, error } = await supabase
    .from("images")
    .select("id,image_key,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((image: any) => ({
    id: image.id,
    imageKey: image.image_key,
    imageUrl: `${WORKER_URL}/images/${encodeR2Key(image.image_key)}`,
    createdAt: image.created_at,
  }));
}
