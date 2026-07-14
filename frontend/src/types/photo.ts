export type SortOrder = "newest" | "oldest";

export interface Photo {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
  owner_id?: string | null;
  folder_id?: string | null;
}

export interface ManagedUser {
  id: string;
  username: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at?: string | null;
}

export interface Folder {
  id: string;
  owner_id: string;
  parent_id: string | null;
  name: string;
  is_default: boolean;
  photo_count: number;
}

export interface PhotoListResponse {
  items: Photo[];
  total: number;
  page: number;
  page_size: number;
}

export interface UploadState {
  name: string;
  progress: number;
}

export interface PhotoWallItem {
  id: string;
  photo: Photo;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
}

export interface PhotoWall {
  id: string;
  owner_id: string;
  name: string;
  background_color: string;
  created_at: string;
  updated_at: string;
  items: PhotoWallItem[];
}

export interface PhotoWallShare {
  token: string;
  path: string;
  is_active: boolean;
}
