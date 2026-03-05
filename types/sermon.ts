export type SermonCategory = "sunday" | "tuesday" | "friday";

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
  likes?: number;
  favorites?: number;
  genre?: string;
  localPath?: string; // Optional local file path for downloaded sermons
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  sermons: Sermon[];
  imageUrl?: string;
}
