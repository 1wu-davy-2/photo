import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Moveable from "react-moveable";
import type { OnDrag, OnResize, OnRotate } from "react-moveable";
import { ArrowLeft, Check, Copy, Expand, ImagePlus, LayoutTemplate, LoaderCircle, Palette, Plus, Save, Share2, Trash2, X } from "lucide-react";

import { createPhotoWall, createPhotoWallShare, getPhotoWall, listPhotoWalls, listPhotos, savePhotoWallLayout, updatePhotoWall } from "../api/client";
import type { Translator } from "../i18n";
import { AuthenticatedImage } from "./AuthenticatedImage";
import type { Photo, PhotoWall, PhotoWallItem } from "../types/photo";

interface PhotoWallPageProps {
  t: Translator;
  accessToken: string;
  wallId?: string | null;
  onBack?: () => void;
}

type EditableItemField = "width" | "height" | "rotation";

const BACKGROUND_PRESETS = ["#F6FAFF", "#FFFFFF", "#E8F2FF", "#FFF0F6", "#182F43", "#F4E9DA"];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function initialPosition(index: number) {
  return {
    x: 5 + (index % 4) * 23,
    y: 6 + (Math.floor(index / 4) % 3) * 28,
    width: 21,
    height: 18,
    rotation: index % 2 ? 3 : -2,
    z_index: index + 1,
  };
}

function normalizeItems(items: PhotoWallItem[]) {
  return items.map((item) => ({
    ...item,
    height: typeof item.height === "number" && Number.isFinite(item.height) ? item.height : Math.max(8, item.width * 0.75),
  }));
}

function styleValueAsPercent(value: string, base: number, fallback: number) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (value.trim().endsWith("%")) return parsed;
  return base > 0 ? (parsed / base) * 100 : fallback;
}

function PhotoWallCanvas({
  wall,
  items,
  accessToken,
  selectedId,
  onSelect,
  onDrop,
  onRemove,
  onItemChange,
}: {
  wall: PhotoWall;
  items: PhotoWallItem[];
  accessToken: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onRemove: (id: string) => void;
  onItemChange: (id: string, patch: Pick<PhotoWallItem, "x" | "y" | "width" | "height" | "rotation">) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rotationById = useRef<Record<string, number>>({});

  useEffect(() => {
    items.forEach((item) => {
      rotationById.current[item.id] = item.rotation;
    });
  }, [items]);

  const syncTarget = useCallback((target: HTMLElement) => {
    const canvas = canvasRef.current;
    const id = target.dataset.wallItemId;
    const item = items.find((candidate) => candidate.id === id);
    if (!canvas || !id || !item) return;

    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    const x = clamp(styleValueAsPercent(target.style.left, canvasWidth, item.x), 0, 100 - item.width);
    const y = clamp(styleValueAsPercent(target.style.top, canvasHeight, item.y), 0, 100 - item.height);
    const width = clamp(styleValueAsPercent(target.style.width, canvasWidth, item.width), 6, 100);
    const height = clamp(styleValueAsPercent(target.style.height, canvasHeight, item.height), 6, 100);
    const rotation = clamp(rotationById.current[id] ?? item.rotation, -180, 180);
    onItemChange(id, { x, y, width, height, rotation });
  }, [items, onItemChange]);

  const targetSelector = selectedId ? `[data-wall-item-id="${selectedId}"]` : null;

  const handleDrag = useCallback((event: OnDrag) => {
    const target = event.target as HTMLElement;
    target.style.left = `${event.left}px`;
    target.style.top = `${event.top}px`;
  }, []);

  const handleResize = useCallback((event: OnResize) => {
    const target = event.target as HTMLElement;
    target.style.width = `${event.width}px`;
    target.style.height = `${event.height}px`;
    target.style.left = `${event.drag.left}px`;
    target.style.top = `${event.drag.top}px`;
  }, []);

  const handleRotate = useCallback((event: OnRotate) => {
    const target = event.target as HTMLElement;
    target.style.transform = event.transform;
    const id = target.dataset.wallItemId;
    if (id) rotationById.current[id] = event.rotation;
  }, []);

  return <>
    <div
      ref={canvasRef}
      className="wall-canvas"
      style={{ backgroundColor: wall.background_color }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("application/x-photo-id")) event.preventDefault();
      }}
      onDrop={onDrop}
      onClick={() => onSelect("")}
    >
      <div className="wall-canvas-label">{wall.name}</div>
      {items.map((item) => <div
        key={item.id}
        data-wall-item-id={item.id}
        className={`wall-item ${selectedId === item.id ? "is-selected" : ""}`}
        style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%`, zIndex: item.z_index, transform: `rotate(${item.rotation}deg)` }}
        onClick={(event) => { event.stopPropagation(); onSelect(item.id); }}
        onPointerDown={(event) => { if (event.button === 0) onSelect(item.id); }}
      >
        <AuthenticatedImage photoId={item.photo.id} alt={item.photo.original_name} accessToken={accessToken} />
        <span className="wall-item-caption">{item.photo.original_name}</span>
        {selectedId === item.id && <button className="wall-item-remove" type="button" title="Remove photo" aria-label={`Remove ${item.photo.original_name}`} onClick={(event) => { event.stopPropagation(); onRemove(item.id); }}><X size={14} /></button>}
      </div>)}
    </div>
    {targetSelector && <Moveable
      target={targetSelector}
      container={canvasRef.current}
      dragContainer={canvasRef.current}
      draggable
      resizable
      rotatable
      origin={false}
      keepRatio={false}
      snappable
      snapThreshold={4}
      controlPadding={5}
      linePadding={5}
      renderDirections={["nw", "n", "ne", "e", "se", "s", "sw", "w"]}
      onDrag={handleDrag}
      onDragEnd={(event) => syncTarget(event.target as HTMLElement)}
      onResize={handleResize}
      onResizeEnd={(event) => syncTarget(event.target as HTMLElement)}
      onRotate={handleRotate}
      onRotateEnd={(event) => syncTarget(event.target as HTMLElement)}
    />}
  </>;
}

export function PhotoWallPage({ t, accessToken, wallId, onBack }: PhotoWallPageProps) {
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
  const initializedKeyRef = useRef<string | null>(null);
  const initializationPromiseRef = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const activeInitializationKeyRef = useRef<string | null>(null);
  const translatorRef = useRef(t);

  useEffect(() => {
    translatorRef.current = t;
  }, [t]);

  const loadWall = useCallback(async (wallId: string) => {
    const nextWall = await getPhotoWall(wallId, accessToken);
    setWall(nextWall);
    setItems(normalizeItems(nextWall.items));
    setSelectedId(null);
    setShareUrl("");
  }, [accessToken]);

  useEffect(() => {
    const initializationKey = `${accessToken}:${wallId ?? "new"}`;
    activeInitializationKeyRef.current = initializationKey;
    if (initializedKeyRef.current === initializationKey || initializationPromiseRef.current?.key === initializationKey) {
      return () => {
        if (activeInitializationKeyRef.current === initializationKey) activeInitializationKeyRef.current = null;
      };
    }

    const initializationPromise = Promise.all([listPhotoWalls(accessToken), listPhotos("", "newest", "owned", accessToken)]).then(async ([nextWalls, photoResponse]) => {
      if (activeInitializationKeyRef.current !== initializationKey) return;
      setPhotos(photoResponse.items);
      if (wallId === null || nextWalls.length === 0) {
        const firstWall = await createPhotoWall({ name: translatorRef.current("wall.defaultName"), background_color: "#F6FAFF" }, accessToken);
        if (activeInitializationKeyRef.current !== initializationKey) return;
        setWalls([firstWall, ...nextWalls]);
        setWall(firstWall);
        setItems(normalizeItems(firstWall.items));
      } else {
        setWalls(nextWalls);
        await loadWall(wallId ?? nextWalls[0].id);
      }
      initializedKeyRef.current = initializationKey;
    }).catch((requestError) => {
      if (activeInitializationKeyRef.current === initializationKey) {
        initializedKeyRef.current = null;
        setError(requestError instanceof Error ? requestError.message : translatorRef.current("manage.error"));
      }
    }).finally(() => {
      if (activeInitializationKeyRef.current === initializationKey) setIsLoading(false);
      if (initializationPromiseRef.current?.promise === initializationPromise) initializationPromiseRef.current = null;
    });

    initializationPromiseRef.current = { key: initializationKey, promise: initializationPromise };
    void initializationPromise;
    return () => {
      if (activeInitializationKeyRef.current === initializationKey) activeInitializationKeyRef.current = null;
    };
  }, [accessToken, loadWall, wallId]);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const availablePhotos = photos;

  const addPhoto = (photoId: string, x?: number, y?: number) => {
    const photo = photos.find((candidate) => candidate.id === photoId);
    if (!photo) return;
    const position = initialPosition(items.length);
    const item: PhotoWallItem = { id: `draft-${photo.id}-${Date.now()}-${items.length}`, photo, x: x ?? position.x, y: y ?? position.y, width: position.width, height: position.height, rotation: position.rotation, z_index: position.z_index };
    setItems((current) => [...current, item]);
    setSelectedId(item.id);
  };

  const handleCanvasDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const photoId = event.dataTransfer.getData("application/x-photo-id");
    if (!photoId) return;
    const canvas = event.currentTarget.getBoundingClientRect();
    const position = initialPosition(items.length);
    const x = clamp(((event.clientX - canvas.left) / canvas.width) * 100, 0, 100 - position.width);
    const y = clamp(((event.clientY - canvas.top) / canvas.height) * 100, 0, 100 - position.height);
    addPhoto(photoId, x, y);
  };

  const updateSelected = (field: EditableItemField, value: number) => {
    if (!selectedId || !Number.isFinite(value)) return;
    const nextValue = field === "rotation" ? clamp(value, -180, 180) : clamp(value, 6, 100);
    setItems((current) => current.map((item) => item.id === selectedId ? { ...item, [field]: nextValue } : item));
  };

  const updateBackground = (color: string) => {
    if (!wall) return;
    setWall((current) => current ? { ...current, background_color: color } : current);
    setWalls((current) => current.map((candidate) => candidate.id === wall.id ? { ...candidate, background_color: color } : candidate));
  };

  const updateItem = useCallback((id: string, patch: Pick<PhotoWallItem, "x" | "y" | "width" | "height" | "rotation">) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }, []);

  const save = async () => {
    if (!wall) return;
    setIsSaving(true); setError(""); setNotice("");
    try {
      const selectedPhotoId = selectedItem?.photo.id;
      const saved = await savePhotoWallLayout(wall.id, { background_color: wall.background_color, items: items.map(({ photo, id, ...item }) => ({ ...item, photo_id: photo.id })) }, accessToken);
      const nextItems = normalizeItems(saved.items);
      setWall(saved); setWalls((current) => current.map((candidate) => candidate.id === saved.id ? saved : candidate)); setItems(nextItems); setSelectedId(selectedPhotoId ? nextItems.find((item) => item.photo.id === selectedPhotoId)?.id ?? null : null); setNotice(t("wall.saved"));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
    finally { setIsSaving(false); }
  };

  const createWall = async () => {
    const name = window.prompt(t("wall.wallName"), t("wall.defaultName"));
    if (!name?.trim()) return;
    try { const created = await createPhotoWall({ name: name.trim(), background_color: wall?.background_color ?? "#F6FAFF" }, accessToken); setWalls((current) => [created, ...current]); await loadWall(created.id); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  const renameWall = async () => {
    if (!wall) return;
    const name = window.prompt(t("wall.wallName"), wall.name);
    if (!name?.trim()) return;
    try {
      const updated = await updatePhotoWall(wall.id, { name: name.trim() }, accessToken);
      setWall(updated); setWalls((current) => current.map((candidate) => candidate.id === updated.id ? updated : candidate));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
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
  return <section className="workspace-page photo-wall-page">
    <div className="page-heading wall-heading"><div><span className="eyebrow"><span className="live-dot" /> {t("wall.eyebrow")}</span><h1>{t("wall.title")}</h1><p>{t("wall.description")}</p></div><div className="wall-toolbar">{onBack && <button className="button button-ghost" type="button" onClick={onBack}><ArrowLeft size={16} /> {t("wall.back")}</button>}<button className="button button-ghost" type="button" onClick={() => void createWall()}><Plus size={16} /> {t("wall.newWall")}</button><button className="button button-ghost" type="button" onClick={() => void renameWall()} disabled={!wall}><LayoutTemplate size={16} /> {t("wall.rename")}</button><button className="button button-primary" type="button" onClick={() => void save()} disabled={!wall || isSaving}><Save size={16} /> {isSaving ? t("wall.saving") : t("wall.save")}</button><button className="button button-soft" type="button" onClick={() => void share()} disabled={!wall}><Share2 size={16} /> {t("wall.share")}</button></div></div>
    {(notice || error) && <div className={`status-banner ${error ? "status-error" : "status-success"}`} role="status"><span>{error || notice}</span>{shareUrl && <div className="share-link-row"><input className="share-link-input" aria-label={t("wall.shareLink")} readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} /><button className="button button-ghost share-copy" type="button" onClick={() => void copyShareUrl(shareUrl)}><Copy size={14} /> {t("wall.copyLink")}</button></div>}</div>}
    <div className="wall-layout"><aside className="wall-sidebar"><div className="wall-panel-heading"><span>{t("wall.selectWall")}</span><span>{walls.length}</span></div><select className="wall-select" value={wall?.id ?? ""} onChange={(event) => void loadWall(event.target.value)}>{walls.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select>
      <div className="wall-background-panel"><div className="wall-panel-heading"><span><Palette size={14} /> {t("wall.background")}</span><span className="wall-color-sample" style={{ backgroundColor: wall?.background_color }} /></div><label className="wall-color-picker"><span>{t("wall.backgroundColor")}</span><input type="color" aria-label={t("wall.backgroundColor")} value={wall?.background_color ?? "#F6FAFF"} onChange={(event) => updateBackground(event.target.value)} /></label><small className="wall-color-hint">{t("wall.colorHint")}</small><div className="wall-color-presets">{BACKGROUND_PRESETS.map((color) => <button key={color} className={`wall-color-swatch ${wall?.background_color.toUpperCase() === color ? "is-active" : ""}`} type="button" title={color} aria-label={`${t("wall.backgroundColor")} ${color}`} style={{ backgroundColor: color }} onClick={() => updateBackground(color)}>{wall?.background_color.toUpperCase() === color && <Check size={12} />}</button>)}</div></div>
      <div className="wall-panel-heading"><span>{t("wall.assets")}</span><span>{availablePhotos.length}</span></div><div className="wall-assets">{availablePhotos.length === 0 ? <div className="wall-empty">{t("wall.emptyAssets")}</div> : availablePhotos.map((photo) => <button key={photo.id} className="wall-asset" type="button" draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-photo-id", photo.id); event.dataTransfer.effectAllowed = "copy"; }} onClick={() => addPhoto(photo.id)}><AuthenticatedImage photoId={photo.id} alt={photo.original_name} loading="lazy" accessToken={accessToken} /><span><strong>{photo.original_name}</strong><small>{t("wall.add")}</small></span><ImagePlus size={15} /></button>)}</div>
    </aside><div className="wall-workspace">{wall && <PhotoWallCanvas wall={wall} items={items} accessToken={accessToken} selectedId={selectedId} onSelect={setSelectedId} onDrop={handleCanvasDrop} onRemove={(id) => { setItems((current) => current.filter((item) => item.id !== id)); setSelectedId(null); }} onItemChange={updateItem} />}</div><aside className="wall-inspector">{selectedItem ? <><div className="wall-panel-heading"><span>{t("wall.selected")}</span><button className="icon-button subtle" type="button" aria-label={t("common.close")} title={t("common.close")} onClick={() => setSelectedId(null)}><X size={15} /></button></div><div className="inspector-preview"><AuthenticatedImage photoId={selectedItem.photo.id} alt={selectedItem.photo.original_name} accessToken={accessToken} /></div><strong className="inspector-name">{selectedItem.photo.original_name}</strong><div className="inspector-dimensions"><label className="number-field"><span>{t("wall.width")}</span><div><input type="number" aria-label={t("wall.width")} min="6" max="100" step="1" value={Math.round(selectedItem.width)} onChange={(event) => updateSelected("width", Number(event.target.value))} /><em>%</em></div></label><label className="number-field"><span>{t("wall.height")}</span><div><input type="number" aria-label={t("wall.height")} min="6" max="100" step="1" value={Math.round(selectedItem.height)} onChange={(event) => updateSelected("height", Number(event.target.value))} /><em>%</em></div></label></div><label className="range-field"><span>{t("wall.rotation")} <b>{Math.round(selectedItem.rotation)}°</b></span><input type="range" min="-180" max="180" value={selectedItem.rotation} onChange={(event) => updateSelected("rotation", Number(event.target.value))} /></label><button className="button button-danger wall-remove" type="button" onClick={() => { setItems((current) => current.filter((item) => item.id !== selectedItem.id)); setSelectedId(null); }}><Trash2 size={15} /> {t("wall.remove")}</button></> : <div className="inspector-empty"><Expand size={25} /><strong>{t("wall.selectHint")}</strong><span>{t("wall.selectHintDescription")}</span></div>}</aside></div>
  </section>;
}
