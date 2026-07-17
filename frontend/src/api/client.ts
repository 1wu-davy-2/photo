import type { Folder, ManagedUser, Photo, PhotoListResponse, PhotoWall, PhotoWallShare, SortOrder } from "../types/photo";
import { clearSession, getAccessToken, type AuthSession } from "../auth/session";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type PhotoImageVariant = "thumbnail" | "preview" | "original";

function notifyUnauthorized(): void {
  clearSession();
  window.dispatchEvent(new Event("auth-expired"));
}

function withAuth(init?: RequestInit, accessToken?: string): RequestInit {
  const headers = new Headers(init?.headers);
  const token = accessToken ?? getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

async function request<T>(path: string, init?: RequestInit, accessToken?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, withAuth(init, accessToken));
  if (response.status === 401) {
    notifyUnauthorized();
    throw new Error("Your session has expired");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Invalid username or password");
  }
  const body = await response.json();
  return {
    accessToken: body.access_token,
    expiresAt: body.expires_at * 1000,
    user: body.user,
  };
}

export function listPhotos(search: string, sort: SortOrder, scope: "owned" | "all" = "owned", accessToken?: string): Promise<PhotoListResponse> {
  const query = new URLSearchParams({ search, sort, page: "1", page_size: "24", scope });
  return request<PhotoListResponse>(`/api/photos?${query.toString()}`, undefined, accessToken);
}

export function uploadPhoto(file: File, onProgress: (progress: number) => void, accessToken?: string, folderId?: string): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/photos/upload`);
    const token = accessToken ?? getAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.responseType = "json";
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status === 401) {
        notifyUnauthorized();
        reject(new Error("Your session has expired"));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as Photo);
        return;
      }
      reject(new Error(xhr.response?.detail ?? "Upload failed"));
    });
    xhr.addEventListener("error", () => reject(new Error("Upload could not reach the archive")));
    const body = new FormData();
    body.append("file", file);
    if (folderId) body.append("folder_id", folderId);
    xhr.send(body);
  });
}

export async function deletePhoto(id: string, scope: "owned" | "all" = "owned", accessToken?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/photos/${id}?scope=${scope}`, withAuth({ method: "DELETE" }, accessToken));
  if (response.status === 401) {
    notifyUnauthorized();
    throw new Error("Your session has expired");
  }
  if (!response.ok) throw new Error("Could not delete this photo");
}

export function listUsers(accessToken?: string): Promise<ManagedUser[]> {
  return request<ManagedUser[]>("/api/users", undefined, accessToken);
}

export function createUser(payload: { username: string; password: string; role: "admin" | "user" }, accessToken?: string): Promise<ManagedUser> {
  return request<ManagedUser>("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, accessToken);
}

export function updateUser(id: string, payload: { role?: "admin" | "user"; is_active?: boolean; password?: string }, accessToken?: string): Promise<ManagedUser> {
  return request<ManagedUser>(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, accessToken);
}

export async function deleteUser(id: string, accessToken?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/users/${id}`, withAuth({ method: "DELETE" }, accessToken));
  if (response.status === 401) { notifyUnauthorized(); throw new Error("Your session has expired"); }
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail ?? "Could not delete the user");
}

export function listFolders(scope: "owned" | "all" = "owned", accessToken?: string): Promise<Folder[]> {
  return request<Folder[]>(`/api/folders?scope=${scope}`, undefined, accessToken);
}

export function createFolder(payload: { name: string; parent_id?: string | null; owner_id?: string }, accessToken?: string): Promise<Folder> {
  return request<Folder>("/api/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, accessToken);
}

export function renameFolder(id: string, name: string, accessToken?: string): Promise<Folder> {
  return request<Folder>(`/api/folders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }, accessToken);
}

export async function deleteFolder(id: string, accessToken?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/folders/${id}`, withAuth({ method: "DELETE" }, accessToken));
  if (response.status === 401) { notifyUnauthorized(); throw new Error("Your session has expired"); }
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail ?? "Could not delete the folder");
}

export function movePhoto(id: string, folder_id: string, accessToken?: string): Promise<Photo> {
  return request<Photo>(`/api/photos/${id}/folder`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder_id }) }, accessToken);
}

export function renamePhoto(id: string, name: string, accessToken?: string): Promise<Photo> {
  return request<Photo>(`/api/photos/${id}/name`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }, accessToken);
}

async function fetchBlobUrl(path: string, signal?: AbortSignal, accessToken?: string): Promise<string> {
  const response = await fetch(`${API_BASE}${path}`, withAuth({ signal }, accessToken));
  if (response.status === 401) {
    notifyUnauthorized();
    throw new Error("Your session has expired");
  }
  if (!response.ok) throw new Error("Photo content could not be loaded");
  return URL.createObjectURL(await response.blob());
}

export async function fetchPhotoBlobUrl(
  id: string,
  variant: PhotoImageVariant = "preview",
  signal?: AbortSignal,
  accessToken?: string,
): Promise<string> {
  const query = variant === "original"
    ? "original=true"
    : `width=${variant === "thumbnail" ? 300 : 1920}`;
  return fetchBlobUrl(`/api/photos/${encodeURIComponent(id)}/content?${query}`, signal, accessToken);
}

export async function downloadPhoto(id: string, filename: string, accessToken?: string): Promise<void> {
  const url = await fetchBlobUrl(`/api/photos/${encodeURIComponent(id)}/download`, undefined, accessToken);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function listPhotoWalls(accessToken?: string): Promise<PhotoWall[]> {
  return request<PhotoWall[]>("/api/photo-walls", undefined, accessToken);
}

export function createPhotoWall(payload: { name: string; background_color?: string }, accessToken?: string): Promise<PhotoWall> {
  return request<PhotoWall>("/api/photo-walls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, accessToken);
}

export function getPhotoWall(id: string, accessToken?: string): Promise<PhotoWall> {
  return request<PhotoWall>(`/api/photo-walls/${id}`, undefined, accessToken);
}

export function updatePhotoWall(id: string, payload: { name?: string; background_color?: string }, accessToken?: string): Promise<PhotoWall> {
  return request<PhotoWall>(`/api/photo-walls/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, accessToken);
}

export function savePhotoWallLayout(id: string, payload: { items: Array<{ photo_id: string; x: number; y: number; width: number; height: number; rotation: number; z_index: number }>; background_color?: string }, accessToken?: string): Promise<PhotoWall> {
  return request<PhotoWall>(`/api/photo-walls/${id}/layout`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, accessToken);
}

export function createPhotoWallShare(id: string, accessToken?: string): Promise<PhotoWallShare> {
  return request<PhotoWallShare>(`/api/photo-walls/${id}/share`, { method: "POST" }, accessToken);
}

export function fetchPublicPhotoWall(token: string): Promise<PhotoWall> {
  return request<PhotoWall>(`/api/photo-wall-shares/${encodeURIComponent(token)}`);
}

export async function fetchPublicPhotoWallPhotoBlobUrl(token: string, photoId: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(`${API_BASE}/api/photo-wall-shares/${encodeURIComponent(token)}/photos/${encodeURIComponent(photoId)}/content`, withAuth({ signal }));
  if (!response.ok) throw new Error("Shared photo content could not be loaded");
  return URL.createObjectURL(await response.blob());
}
