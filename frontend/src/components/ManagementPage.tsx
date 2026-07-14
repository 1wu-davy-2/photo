import { FormEvent, useCallback, useEffect, useState } from "react";
import { Folder, FolderPlus, LoaderCircle, Pencil, Trash2 } from "lucide-react";

import { createFolder, deleteFolder, deletePhoto, listFolders, listPhotos, movePhoto, renameFolder, renamePhoto } from "../api/client";
import type { Translator } from "../i18n";
import { AuthenticatedImage } from "./AuthenticatedImage";
import type { Folder as FolderType, Photo } from "../types/photo";

export function ManagementPage({ t, isAdmin, accessToken }: { t: Translator; isAdmin: boolean; accessToken: string }) {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [folderName, setFolderName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const scope = isAdmin ? "all" : "owned";

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try { const [nextFolders, nextPhotos] = await Promise.all([listFolders(scope, accessToken), listPhotos("", "newest", scope, accessToken)]); setFolders(nextFolders); setPhotos(nextPhotos.items); setError(""); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); } finally { setIsLoading(false); }
  }, [accessToken, scope, t]);

  useEffect(() => { void refresh(); }, [refresh]);

  const submitFolder = async (event: FormEvent) => {
    event.preventDefault();
    if (!folderName.trim()) return;
    try { await createFolder({ name: folderName.trim() }, accessToken); setFolderName(""); await refresh(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  const rename = async (folder: FolderType) => {
    const name = window.prompt(t("manage.folderName"), folder.name);
    if (!name || name.trim() === folder.name) return;
    try { await renameFolder(folder.id, name.trim(), accessToken); await refresh(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  const removeFolder = async (folder: FolderType) => {
    if (!window.confirm(t("manage.confirmDelete"))) return;
    try { await deleteFolder(folder.id, accessToken); await refresh(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  const renameAsset = async (photo: Photo) => {
    const name = window.prompt(t("manage.fileName"), photo.original_name);
    if (!name || name.trim() === photo.original_name) return;
    try { await renamePhoto(photo.id, name.trim(), accessToken); await refresh(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  const moveAsset = async (photo: Photo, folderId: string) => {
    try { await movePhoto(photo.id, folderId, accessToken); await refresh(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  const removeAsset = async (photo: Photo) => {
    if (!window.confirm(t("manage.confirmDelete"))) return;
    try { await deletePhoto(photo.id, scope, accessToken); await refresh(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  return (
    <section className="workspace-page">
      <div className="page-heading"><div><span className="eyebrow"><span className="live-dot" /> {t("manage.eyebrow")}</span><h1>{t("manage.title")}</h1><p>{t("manage.description")}</p></div><div className="page-heading-mark"><Folder size={34} /></div></div>
      <div className="management-layout folder-layout">
        <aside className="control-panel folder-panel"><div className="panel-heading"><div><span className="eyebrow">01</span><h2>{t("manage.folders")}</h2></div><FolderPlus size={20} /></div><form className="inline-create" onSubmit={submitFolder}><input aria-label={t("manage.folderName")} placeholder={t("manage.folderName")} value={folderName} onChange={(event) => setFolderName(event.target.value)} /><button className="icon-button" type="submit" title={t("manage.create")} aria-label={t("manage.create")}><FolderPlus size={17} /></button></form>{isLoading ? <div className="table-state"><LoaderCircle className="spin" size={20} /></div> : folders.length === 0 ? <div className="table-state">{t("manage.noFolders")}</div> : <div className="folder-list">{folders.map((folder) => <div className="folder-item" key={folder.id}><div className="folder-label"><Folder size={16} /><span>{folder.name}</span>{folder.is_default && <small>{t("manage.default")}</small>}</div><span className="folder-count">{folder.photo_count}</span><button className="icon-button subtle" type="button" title={t("manage.rename")} aria-label={`${t("manage.rename")} ${folder.name}`} onClick={() => void rename(folder)}><Pencil size={14} /></button><button className="icon-button subtle danger-icon" type="button" title={t("manage.delete")} aria-label={`${t("manage.delete")} ${folder.name}`} onClick={() => void removeFolder(folder)}><Trash2 size={14} /></button></div>)}</div>}</aside>
        <div className="control-panel asset-panel"><div className="panel-heading"><div><span className="eyebrow">02</span><h2>{t("manage.assets")}</h2></div><span className="panel-count">{photos.length}</span></div>{error && <div className="inline-error" role="alert">{error}</div>}{isLoading ? <div className="table-state"><LoaderCircle className="spin" size={20} /></div> : photos.length === 0 ? <div className="table-state">{t("manage.noAssets")}</div> : <div className="data-table asset-table"><div className="table-row table-header"><span>{t("manage.fileName")}</span><span>{t("manage.folder")}</span><span>{t("manage.date")}</span><span>{t("users.actions")}</span></div>{photos.map((photo) => <div className="table-row" key={photo.id}><span className="asset-name"><AuthenticatedImage photoId={photo.id} alt={photo.original_name} loading="lazy" accessToken={accessToken} /><strong>{photo.original_name}</strong></span><select aria-label={`${t("manage.move")} ${photo.original_name}`} value={photo.folder_id ?? ""} onChange={(event) => void moveAsset(photo, event.target.value)}>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select><span className="asset-date">{new Date(photo.created_at).toLocaleDateString()}</span><span className="row-actions"><button className="icon-button subtle" type="button" title={t("manage.rename")} aria-label={`${t("manage.rename")} ${photo.original_name}`} onClick={() => void renameAsset(photo)}><Pencil size={15} /></button><button className="icon-button subtle danger-icon" type="button" title={t("manage.delete")} aria-label={`${t("manage.delete")} ${photo.original_name}`} onClick={() => void removeAsset(photo)}><Trash2 size={15} /></button></span></div>)}</div>}</div>
      </div>
    </section>
  );
}
