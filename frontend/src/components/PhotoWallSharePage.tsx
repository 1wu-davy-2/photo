import { useEffect, useState } from "react";
import { LoaderCircle, LockKeyhole, Share2 } from "lucide-react";

import { fetchPublicPhotoWall, fetchPublicPhotoWallPhotoBlobUrl } from "../api/client";
import type { PhotoWall } from "../types/photo";

function PublicWallImage({ token, photoId, alt }: { token: string; photoId: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let url: string | null = null;
    void fetchPublicPhotoWallPhotoBlobUrl(token, photoId, controller.signal).then((nextUrl) => { url = nextUrl; setSrc(nextUrl); }).catch(() => undefined);
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [photoId, token]);
  return src ? <img src={src} alt={alt} /> : <span className="authenticated-image-loading" aria-label={`Loading ${alt}`} />;
}

export function PhotoWallSharePage({ token }: { token: string }) {
  const [wall, setWall] = useState<PhotoWall | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void fetchPublicPhotoWall(token).then(setWall).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Shared wall not found")); }, [token]);
  if (error) return <main className="shared-wall-state"><Share2 size={30} /><h1>照片墙不可用</h1><p>{error}</p></main>;
  if (!wall) return <main className="shared-wall-state"><LoaderCircle className="spin" size={25} /><span>正在打开照片墙</span></main>;
  return <main className="shared-wall-page"><header className="shared-wall-header"><div className="shared-brand"><span className="brand-mark"><Share2 size={18} /></span><span><strong>Lumen Archive</strong><small>shared photo wall</small></span></div><span className="shared-readonly"><LockKeyhole size={14} /> 只读分享</span></header><div className="shared-wall-copy"><span className="eyebrow"><Share2 size={14} /> Shared wall</span><h1>{wall.name}</h1><p>由 Lumen Archive 分享的照片墙。</p></div><div className="shared-wall-canvas" style={{ backgroundColor: wall.background_color }}>{wall.items.map((item) => <div key={item.id} className="wall-item" style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, zIndex: item.z_index, transform: `rotate(${item.rotation}deg)` }}><PublicWallImage token={token} photoId={item.photo.id} alt={item.photo.original_name} /><span className="wall-item-caption">{item.photo.original_name}</span></div>)}</div></main>;
}
