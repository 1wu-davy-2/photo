import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Clock3, Layers3, LoaderCircle, Plus } from "lucide-react";

import { listPhotoWalls } from "../api/client";
import type { Translator } from "../i18n";
import { AuthenticatedImage } from "./AuthenticatedImage";
import type { PhotoWall, PhotoWallItem } from "../types/photo";

const PAGE_SIZE = 12;

function previewHeight(item: PhotoWallItem) {
  return typeof item.height === "number" && Number.isFinite(item.height) ? item.height : Math.max(8, item.width * 0.75);
}

function PhotoWallPreview({ wall, accessToken }: { wall: PhotoWall; accessToken: string }) {
  const items = wall.items.slice(0, 6);
  return <div className="wall-card-preview" style={{ backgroundColor: wall.background_color }} aria-label={wall.name}>
    {items.length === 0 ? <div className="wall-card-empty"><Layers3 size={25} /><span>Empty canvas</span></div> : items.map((item) => <div key={item.id} className="wall-card-item" style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${previewHeight(item)}%`, zIndex: item.z_index, transform: `rotate(${item.rotation}deg)` }}><AuthenticatedImage photoId={item.photo.id} alt={item.photo.original_name} accessToken={accessToken} /></div>)}
    {wall.items.length > items.length && <span className="wall-card-more">+{wall.items.length - items.length}</span>}
  </div>;
}

export function PhotoWallLibraryPage({ t, accessToken, onCreate, onOpen }: { t: Translator; accessToken: string; onCreate: () => void; onOpen: (id: string) => void }) {
  const [walls, setWalls] = useState<PhotoWall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    void listPhotoWalls(accessToken).then((nextWalls) => { if (active) setWalls(nextWalls); }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : t("manage.error")); }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [accessToken, t]);

  const pageCount = Math.max(1, Math.ceil(walls.length / PAGE_SIZE));
  const visibleWalls = useMemo(() => walls.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page, walls]);
  useEffect(() => { setPage((current) => Math.min(current, pageCount)); }, [pageCount]);

  return <section className="workspace-page photo-wall-library-page">
    <div className="page-heading wall-library-heading"><div><span className="eyebrow"><span className="live-dot" /> {t("wall.libraryEyebrow")}</span><h1>{t("wall.libraryTitle")}</h1><p>{t("wall.libraryDescription")}</p></div><button className="button button-primary" type="button" onClick={onCreate}><Plus size={16} /> {t("wall.newWall")}</button></div>
    {error && <div className="status-banner status-error" role="status">{error}</div>}
    {isLoading ? <div className="state-panel"><LoaderCircle className="spin" size={24} /><span>{t("wall.loading")}</span></div> : walls.length === 0 ? <div className="empty-panel wall-library-empty"><Layers3 size={28} /><span className="eyebrow">{t("wall.libraryEyebrow")}</span><h3>{t("wall.emptyTitle")}</h3><p>{t("wall.emptyDescription")}</p><button className="button button-primary" type="button" onClick={onCreate}><Plus size={16} /> {t("wall.newWall")}</button></div> : <>
      <div className="wall-library-grid">{visibleWalls.map((wall) => <article className="wall-card" key={wall.id}><button className="wall-card-button" type="button" aria-label={`${t("wall.open")}: ${wall.name}`} onClick={() => onOpen(wall.id)}><PhotoWallPreview wall={wall} accessToken={accessToken} /><div className="wall-card-details"><div className="wall-card-title"><div><h2>{wall.name}</h2><span><Layers3 size={13} /> {wall.items.length} {t("wall.photos")}</span></div><ArrowRight size={17} /></div><div className="wall-card-meta"><span><Clock3 size={12} /> {t("wall.updated")} {new Date(wall.updated_at).toLocaleDateString()}</span><span>{t("wall.open")}</span></div></div></button></article>)}</div>
      <div className="wall-pagination"><span>{t("wall.page")} {page} / {pageCount}</span><div><button className="icon-button" type="button" aria-label={t("wall.previousPage")} title={t("wall.previousPage")} disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={16} /></button><button className="icon-button" type="button" aria-label={t("wall.nextPage")} title={t("wall.nextPage")} disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight size={16} /></button></div></div>
    </>}
  </section>;
}
