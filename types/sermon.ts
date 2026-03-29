export type SermonCategory = "sunday" | "tuesday" | "friday" | "other";

export interface Sermon {
  id: string;
  title: string;
  preacher: string;
  date: string;
  duration: number; // in seconds
  audioUrl: string;
  imageUrl?: string;
  description?: string;
  category?: SermonCategory;
  plays?: number;
  playCount?: number; // Optional play count for compatibility
  likes?: number;
  favorites?: number;
  genre?: string;
  localPath?: string; // Optional local file path for downloaded sermons
  localImagePath?: string; // ✅ store downloaded image
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  sermons: Sermon[];
  imageUrl?: string;
  localImagePath?: string; // Optional local file path for downloaded playlist image
}
