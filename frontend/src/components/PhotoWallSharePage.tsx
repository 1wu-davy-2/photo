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
  if (error) return <main className="shared-wall-state"><Share2 size={30} /><h1>{"\u7167\u7247\u5899\u4e0d\u53ef\u7528"}</h1><p>{error}</p></main>;
  if (!wall) return <main className="shared-wall-state"><LoaderCircle className="spin" size={25} /><span>{"\u6b63\u5728\u6253\u5f00\u7167\u7247\u5899"}</span></main>;
  return <main className="shared-wall-page"><header className="shared-wall-header"><div className="shared-brand"><span className="brand-mark"><Share2 size={18} /></span><span><strong>Lumen Archive</strong><small>shared photo wall</small></span></div><span className="shared-readonly"><LockKeyhole size={14} /> {"\u53ea\u8bfb\u5206\u4eab"}</span></header><div className="shared-wall-copy"><span className="eyebrow"><Share2 size={14} /> Shared wall</span><h1>{wall.name}</h1><p>{"\u7531 Lumen Archive \u5206\u4eab\u7684\u7167\u7247\u5899\u3002"}</p></div><div className="shared-wall-canvas" style={{ backgroundColor: wall.background_color }}>{wall.items.map((item) => <div key={item.id} className="wall-item" style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height ?? Math.max(8, item.width * 0.75)}%`, zIndex: item.z_index, transform: `rotate(${item.rotation}deg)` }}><PublicWallImage token={token} photoId={item.photo.id} alt={item.photo.original_name} /><span className="wall-item-caption">{item.photo.original_name}</span></div>)}</div></main>;
}
