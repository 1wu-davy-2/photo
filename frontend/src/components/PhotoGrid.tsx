import type { CSSProperties } from "react";
import { CalendarDays, Maximize2 } from "lucide-react";

import type { Photo } from "../types/photo";
import type { Translator } from "../i18n";
import { AuthenticatedImage } from "./AuthenticatedImage";

interface PhotoGridProps {
  photos: Photo[];
  onSelect: (photo: Photo) => void;
  t: Translator;
  accessToken: string;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function PhotoGrid({ photos, onSelect, t, accessToken }: PhotoGridProps) {
  return (
    <div className="photo-grid" aria-label="Photo archive">
      {photos.map((photo, index) => (
        <button
          className="photo-card"
          key={photo.id}
          type="button"
          style={{ "--photo-ratio": `${photo.width} / ${photo.height}`, "--stagger": `${Math.min(index, 7) * 55}ms` } as CSSProperties}
          aria-label={`${t("gallery.open")} / Open ${photo.original_name}`}
          onClick={() => onSelect(photo)}
        >
          <span className="photo-image-wrap">
            <AuthenticatedImage photoId={photo.id} alt={photo.original_name} loading={index < 6 ? "eager" : "lazy"} accessToken={accessToken} />
            <span className="photo-card-shade" />
            <span className="photo-card-open"><Maximize2 size={16} /></span>
          </span>
          <span className="photo-card-details">
            <strong title={photo.original_name}>{photo.original_name}</strong>
            <span className="photo-meta">
              <span><CalendarDays size={13} /> {formatDate(photo.created_at)}</span>
              <span>{photo.width} × {photo.height} · {formatSize(photo.size_bytes)}</span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
