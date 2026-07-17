import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download, LoaderCircle, ScanSearch, Trash2, X } from "lucide-react";

import { downloadPhoto, type PhotoImageVariant } from "../api/client";
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
  const [variant, setVariant] = useState<PhotoImageVariant>("preview");
  const [originalStatus, setOriginalStatus] = useState<"idle" | "loading" | "loaded">("idle");

  const handleDownload = async () => {
    await downloadPhoto(photo.id, photo.original_name, accessToken);
  };

  const handleViewOriginal = () => {
    setOriginalStatus("loading");
    setVariant("original");
  };

  useEffect(() => {
    setVariant("preview");
    setOriginalStatus("idle");
  }, [photo.id]);

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
        <AuthenticatedImage
          photoId={photo.id}
          alt={photo.original_name}
          accessToken={accessToken}
          variant={variant}
          onLoad={() => {
            if (variant === "original") setOriginalStatus("loaded");
          }}
        />
        {hasNext && <button type="button" className="lightbox-nav next" title={t("common.next")} aria-label={t("common.next")} onClick={onNext}><ChevronRight size={28} /></button>}
      </div>
      <div className="lightbox-footer">
        <div className="lightbox-meta"><span>{photo.width} × {photo.height}</span><span>{photo.mime_type.replace("image/", "").toUpperCase()}</span></div>
        <div className="lightbox-actions">
          <button className="button button-ghost" type="button" onClick={handleDownload}><Download size={16} /> {t("common.downloadOriginal")}</button>
          <button
            className="button button-ghost"
            type="button"
            onClick={handleViewOriginal}
            disabled={originalStatus !== "idle"}
            aria-live="polite"
          >
            {originalStatus === "loading" ? <LoaderCircle className="spin" size={16} /> : originalStatus === "loaded" ? <Check size={16} /> : <ScanSearch size={16} />}
            {t(originalStatus === "loading" ? "common.loadingOriginal" : originalStatus === "loaded" ? "common.originalLoaded" : "common.viewOriginal")}
          </button>
          <button className="button button-danger" type="button" onClick={onDelete}><Trash2 size={16} /> {t("common.delete")}</button>
        </div>
      </div>
    </div>
  );
}
