import { useEffect, useState } from "react";

import { fetchPhotoBlobUrl } from "../api/client";

interface BlobCacheEntry {
  promise: Promise<string>;
  controller: AbortController;
  refCount: number;
  objectUrl: string | null;
  releaseTimer: number | null;
}

const blobCache = new Map<string, BlobCacheEntry>();

function acquirePhotoBlob(photoId: string, accessToken: string): { promise: Promise<string>; release: () => void } {
  const key = `${photoId}:${accessToken}`;
  let entry = blobCache.get(key);
  if (!entry) {
    const controller = new AbortController();
    const nextEntry: BlobCacheEntry = {
      controller,
      refCount: 0,
      objectUrl: null,
      releaseTimer: null,
      promise: fetchPhotoBlobUrl(photoId, controller.signal, accessToken),
    };
    entry = nextEntry;
    blobCache.set(key, nextEntry);
    nextEntry.promise.then((url) => { nextEntry.objectUrl = url; }).catch(() => {
      if (blobCache.get(key) === nextEntry) blobCache.delete(key);
    });
  }

  const currentEntry = entry;
  currentEntry.refCount += 1;
  if (currentEntry.releaseTimer !== null) {
    window.clearTimeout(currentEntry.releaseTimer);
    currentEntry.releaseTimer = null;
  }

  let released = false;
  return {
    promise: currentEntry.promise,
    release: () => {
      if (released) return;
      released = true;
      currentEntry.refCount -= 1;
      if (currentEntry.refCount > 0) return;
      currentEntry.releaseTimer = window.setTimeout(() => {
        if (currentEntry.refCount > 0 || blobCache.get(key) !== currentEntry) return;
        blobCache.delete(key);
        if (currentEntry.objectUrl) URL.revokeObjectURL(currentEntry.objectUrl);
        else currentEntry.controller.abort();
      }, 0);
    },
  };
}

interface AuthenticatedImageProps {
  photoId: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  accessToken: string;
}

export function AuthenticatedImage({ photoId, alt, className, loading, accessToken }: AuthenticatedImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(null);
    const { promise, release } = acquirePhotoBlob(photoId, accessToken);
    let active = true;
    promise
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => { if (active) setSrc(null); });
    return () => {
      active = false;
      release();
    };
  }, [photoId, accessToken]);

  if (!src) return <span className="authenticated-image-loading" aria-label={`Loading ${alt}`} />;
  return <img className={className} src={src} alt={alt} loading={loading} />;
}
