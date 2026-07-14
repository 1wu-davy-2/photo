import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Expand, ImagePlus, LayoutTemplate, LoaderCircle, Plus, Save, Share2, Trash2, X } from "lucide-react";

import { createPhotoWall, createPhotoWallShare, getPhotoWall, listPhotoWalls, listPhotos, savePhotoWallLayout, updatePhotoWall } from "../api/client";
import type { Translator } from "../i18n";
import { AuthenticatedImage } from "./AuthenticatedImage";
import type { Photo, PhotoWall, PhotoWallItem } from "../types/photo";

interface PhotoWallPageProps {
  t: Translator;
  accessToken: string;
}

function initialPosition(index: number) {
  return { x: 5 + (index % 4) * 23, y: 6 + (Math.floor(index / 4) % 3) * 28, width: 21, rotation: index % 2 ? 3 : -2, z_index: index + 1 };
}

function PhotoWallCanvas({ wall, items, accessToken, selectedId, onSelect, onDrop, onRemove }: { wall: PhotoWall; items: PhotoWallItem[]; accessToken: string; selectedId: string | null; onSelect: (id: string) => void; onDrop: (event: React.DragEvent<HTMLDivElement>) => void; onRemove: (id: string) => void }) {
  return <div className="wall-canvas" style={{ backgroundColor: wall.background_color }} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onClick={() => onSelect("")}><div className="wall-canvas-label">{wall.name}</div>{items.map((item) => <div key={item.id} className={`wall-item ${selectedId === item.id ? "is-selected" : ""}`} draggable style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, zIndex: item.z_index, transform: `rotate(${item.rotation}deg)` }} onClick={(event) => { event.stopPropagation(); onSelect(item.id); }} onDragStart={(event) => { event.dataTransfer.setData("application/x-wall-item", item.id); event.dataTransfer.effectAllowed = "move"; }}><AuthenticatedImage photoId={item.photo.id} alt={item.photo.original_name} accessToken={accessToken} /><span className="wall-item-caption">{item.photo.original_name}</span>{selectedId === item.id && <button className="wall-item-remove" type="button" title={"Remove photo"} aria-label={`Remove ${item.photo.original_name}`} onClick={(event) => { event.stopPropagation(); onRemove(item.id); }}><X size={14} /></button>}</div>)}</div>;
}

export function PhotoWallPage({ t, accessToken }: PhotoWallPageProps) {
  const [walls, setWalls] = useState<PhotoWall[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [wall, setWall] = useState<PhotoWall | null>(null);
  const [items, setItems] = useState<PhotoWallItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  const loadWall = useCallback(async (wallId: string) => {
    const nextWall = await getPhotoWall(wallId, accessToken);
    setWall(nextWall);
    setItems(nextWall.items);
    setSelectedId(null);
    setShareUrl("");
  }, [accessToken]);

  useEffect(() => {
    let active = true;
    void Promise.all([listPhotoWalls(accessToken), listPhotos("", "newest", "owned", accessToken)]).then(async ([nextWalls, photoResponse]) => {
      if (!active) return;
      setPhotos(photoResponse.items);
      if (nextWalls.length === 0) {
        const firstWall = await createPhotoWall({ name: "我的照片墙", background_color: "#F6FAFF" }, accessToken);
        if (!active) return;
        setWalls([firstWall]);
        setWall(firstWall);
        setItems([]);
      } else {
        setWalls(nextWalls);
        await loadWall(nextWalls[0].id);
      }
    }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : t("manage.error")); }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [accessToken, loadWall, t]);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const availablePhotos = photos.filter((photo) => !items.some((item) => item.photo.id === photo.id));

  const addPhoto = (photoId: string, x?: number, y?: number) => {
    const photo = photos.find((candidate) => candidate.id === photoId);
    if (!photo || items.some((item) => item.photo.id === photoId)) return;
    const position = initialPosition(items.length);
    const item: PhotoWallItem = { id: `draft-${photo.id}`, photo, x: x ?? position.x, y: y ?? position.y, width: position.width, rotation: position.rotation, z_index: position.z_index };
    setItems((current) => [...current, item]);
    setSelectedId(item.id);
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const canvas = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(82, ((event.clientX - canvas.left) / canvas.width) * 100));
    const y = Math.max(0, Math.min(82, ((event.clientY - canvas.top) / canvas.height) * 100));
    const photoId = event.dataTransfer.getData("application/x-photo-id");
    const itemId = event.dataTransfer.getData("application/x-wall-item");
    if (photoId) addPhoto(photoId, x, y);
    if (itemId) setItems((current) => current.map((item) => item.id === itemId ? { ...item, x, y } : item));
  };

  const updateSelected = (field: "width" | "rotation", value: number) => {
    if (!selectedId) return;
    setItems((current) => current.map((item) => item.id === selectedId ? { ...item, [field]: value } : item));
  };

  const save = async () => {
    if (!wall) return;
    setIsSaving(true); setError(""); setNotice("");
    try {
      const saved = await savePhotoWallLayout(wall.id, items.map(({ photo, id, ...item }) => ({ ...item, photo_id: photo.id })), accessToken);
      setWall(saved); setWalls((current) => current.map((candidate) => candidate.id === saved.id ? saved : candidate)); setItems(saved.items); setNotice(t("wall.saved"));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
    finally { setIsSaving(false); }
  };

  const createWall = async () => {
    const name = window.prompt(t("wall.wallName"), "新的照片墙");
    if (!name?.trim()) return;
    try { const created = await createPhotoWall({ name: name.trim(), background_color: wall?.background_color ?? "#F6FAFF" }, accessToken); setWalls((current) => [created, ...current]); await loadWall(created.id); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  const renameWall = async () => {
    if (!wall) return;
    const name = window.prompt(t("wall.wallName"), wall.name);
    if (!name?.trim()) return;
    try { const updated = await updatePhotoWall(wall.id, { name: name.trim() }, accessToken); setWall(updated); setWalls((current) => current.map((candidate) => candidate.id === updated.id ? updated : candidate)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  const copyShareUrl = async (url: string) => {
    if (!navigator.clipboard?.writeText) { setNotice(t("wall.shareReady")); return; }
    try { await navigator.clipboard.writeText(url); setNotice(t("wall.shareCopied")); } catch { setNotice(t("wall.shareReady")); }
  };

  const share = async () => {
    if (!wall) return;
    setError(""); setNotice("");
    try { const created = await createPhotoWallShare(wall.id, accessToken); const url = `${window.location.origin}${created.path}`; setShareUrl(url); await copyShareUrl(url); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  if (isLoading) return <section className="wall-loading"><LoaderCircle className="spin" size={24} /> {t("wall.loading")}</section>;
  return <section className="workspace-page photo-wall-page"><div className="page-heading wall-heading"><div><span className="eyebrow"><span className="live-dot" /> {t("wall.eyebrow")}</span><h1>{t("wall.title")}</h1><p>{t("wall.description")}</p></div><div className="wall-toolbar"><button className="button button-ghost" type="button" onClick={() => void createWall()}><Plus size={16} /> {t("wall.newWall")}</button><button className="button button-ghost" type="button" onClick={() => void renameWall()} disabled={!wall}><LayoutTemplate size={16} /> {t("wall.rename")}</button><button className="button button-primary" type="button" onClick={() => void save()} disabled={!wall || isSaving}><Save size={16} /> {isSaving ? t("wall.saving") : t("wall.save")}</button><button className="button button-soft" type="button" onClick={() => void share()} disabled={!wall}><Share2 size={16} /> {t("wall.share")}</button></div></div>{(notice || error) && <div className={`status-banner ${error ? "status-error" : "status-success"}`} role="status"><span>{error || notice}</span>{shareUrl && <div className="share-link-row"><input className="share-link-input" aria-label={t("wall.shareLink")} readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} /><button className="button button-ghost share-copy" type="button" onClick={() => void copyShareUrl(shareUrl)}><Copy size={14} /> {t("wall.copyLink")}</button></div>}</div>}<div className="wall-layout"><aside className="wall-sidebar"><div className="wall-panel-heading"><span>{t("wall.selectWall")}</span><span>{walls.length}</span></div><select className="wall-select" value={wall?.id ?? ""} onChange={(event) => void loadWall(event.target.value)}>{walls.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select><div className="wall-panel-heading"><span>{t("wall.assets")}</span><span>{availablePhotos.length}</span></div><div className="wall-assets">{availablePhotos.length === 0 ? <div className="wall-empty">{t("wall.emptyAssets")}</div> : availablePhotos.map((photo) => <button key={photo.id} className="wall-asset" type="button" draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-photo-id", photo.id); event.dataTransfer.effectAllowed = "copy"; }} onClick={() => addPhoto(photo.id)}><AuthenticatedImage photoId={photo.id} alt={photo.original_name} loading="lazy" accessToken={accessToken} /><span><strong>{photo.original_name}</strong><small>{t("wall.add")}</small></span><ImagePlus size={15} /></button>)}</div></aside><div className="wall-workspace">{wall && <PhotoWallCanvas wall={wall} items={items} accessToken={accessToken} selectedId={selectedId} onSelect={setSelectedId} onDrop={handleCanvasDrop} onRemove={(id) => { setItems((current) => current.filter((item) => item.id !== id)); setSelectedId(null); }} />}</div><aside className="wall-inspector">{selectedItem ? <><div className="wall-panel-heading"><span>{t("wall.selected")}</span><button className="icon-button subtle" type="button" aria-label={t("common.close")} title={t("common.close")} onClick={() => setSelectedId(null)}><X size={15} /></button></div><div className="inspector-preview"><AuthenticatedImage photoId={selectedItem.photo.id} alt={selectedItem.photo.original_name} accessToken={accessToken} /></div><strong className="inspector-name">{selectedItem.photo.original_name}</strong><label className="range-field"><span>{t("wall.size")} <b>{Math.round(selectedItem.width)}%</b></span><input type="range" min="10" max="55" value={selectedItem.width} onChange={(event) => updateSelected("width", Number(event.target.value))} /></label><label className="range-field"><span>{t("wall.rotation")} <b>{Math.round(selectedItem.rotation)}°</b></span><input type="range" min="-12" max="12" value={selectedItem.rotation} onChange={(event) => updateSelected("rotation", Number(event.target.value))} /></label><button className="button button-danger wall-remove" type="button" onClick={() => { setItems((current) => current.filter((item) => item.id !== selectedItem.id)); setSelectedId(null); }}><Trash2 size={15} /> {t("wall.remove")}</button></> : <div className="inspector-empty"><Expand size={25} /><strong>{t("wall.selectHint")}</strong><span>{t("wall.selectHintDescription")}</span></div>}</aside></div></section>;
}
