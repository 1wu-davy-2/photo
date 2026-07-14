import { useEffect, useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";

interface GlobalDropUploadProps {
  onDrop: (dataTransfer: DataTransfer) => void;
}

export function GlobalDropUpload({ onDrop }: GlobalDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setIsDragging(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setIsDragging(false);
    };
    const onDropEvent = (event: DragEvent) => {
      if (!hasFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      onDrop(event.dataTransfer);
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDropEvent);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDropEvent);
    };
  }, [onDrop]);

  if (!isDragging) return null;
  return <div className="global-drop-overlay" role="status"><div className="global-drop-card"><button className="icon-button" type="button" aria-label="Cancel upload" title="Cancel upload" onClick={() => setIsDragging(false)}><X size={17} /></button><span className="global-drop-icon"><UploadCloud size={30} /></span><strong>拖到这里上传</strong><span>支持图片和文件夹，松开后可选择存放目录</span></div></div>;
}
