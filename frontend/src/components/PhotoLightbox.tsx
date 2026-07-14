import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Trash2, X } from "lucide-react";

import { downloadPhoto, fetchPhotoBlobUrl } from "../api/client";
import type { Photo } from "../types/photo";
import type { Translator } from "../i18n";
import { AuthenticatedImage } from "./AuthenticatedImage";

interface PhotoLightboxProps {
  photo: Photo;
  hasPrevious: boolean;
  hasNext: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDelete: () => void;
  t: Translator;
  accessToken: string;
}

export function PhotoLightbox({ photo, hasPrevious, hasNext, onClose, onPrevious, onNext, onDelete, t, accessToken }: PhotoLightboxProps) {
  const handleDownload = async () => {
    await downloadPhoto(photo.id, photo.original_name, accessToken);
  };

  const handleOpenOriginal = async () => {
    const url = await fetchPhotoBlobUrl(photo.id, undefined, accessToken);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrevious) onPrevious();
      if (event.key === "ArrowRight" && hasNext) onNext();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("lightbox-open");
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("lightbox-open");
    };
  }, [hasNext, hasPrevious, onClose, onNext, onPrevious]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={photo.original_name} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="lightbox-header">
        <div>
          <span className="eyebrow">{t("gallery.open")}</span>
          <strong>{photo.original_name}</strong>
        </div>
        <button type="button" className="icon-button light" title={t("common.close")} aria-label={t("common.close")} onClick={onClose}><X size={20} /></button>
      </div>
      <div className="lightbox-stage">
        {hasPrevious && <button type="button" className="lightbox-nav prev" title={t("common.previous")} aria-label={t("common.previous")} onClick={onPrevious}><ChevronLeft size={28} /></button>}
        <AuthenticatedImage photoId={photo.id} alt={photo.original_name} accessToken={accessToken} />
        {hasNext && <button type="button" className="lightbox-nav next" title={t("common.next")} aria-label={t("common.next")} onClick={onNext}><ChevronRight size={28} /></button>}
      </div>
      <div className="lightbox-footer">
        <div className="lightbox-meta"><span>{photo.width} × {photo.height}</span><span>{photo.mime_type.replace("image/", "").toUpperCase()}</span></div>
        <div className="lightbox-actions">
          <button className="button button-ghost" type="button" onClick={handleDownload}><Download size={16} /> {t("common.download")}</button>
          <button className="button button-ghost" type="button" onClick={handleOpenOriginal}><ExternalLink size={16} /> {t("common.openOriginal")}</button>
          <button className="button button-danger" type="button" onClick={onDelete}><Trash2 size={16} /> {t("common.delete")}</button>
        </div>
      </div>
    </div>
  );
}
