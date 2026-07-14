import { useRef, useState } from "react";
import { ArrowUp, FileImage, LoaderCircle, UploadCloud } from "lucide-react";

import type { Translator } from "../i18n";
import type { UploadState } from "../types/photo";

interface UploadDropzoneProps {
  upload: UploadState | null;
  onFiles: (files: FileList | File[]) => void;
  onChooseRef?: (open: () => void) => void;
  t: Translator;
}

export function UploadDropzone({ upload, onFiles, onChooseRef, t }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => inputRef.current?.click();
  if (onChooseRef) onChooseRef(openPicker);

  return (
    <section className={`upload-zone ${isDragging ? "is-dragging" : ""} ${upload ? "is-uploading" : ""}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }} onDrop={(event) => { event.preventDefault(); setIsDragging(false); onFiles(event.dataTransfer.files); }} aria-label={t("nav.upload")}>
      <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(event) => event.target.files && onFiles(event.target.files)} />
      {upload ? (
        <div className="upload-progress"><div className="upload-progress-icon"><LoaderCircle className="spin" size={21} /></div><div className="upload-progress-copy"><strong>{t("gallery.uploadProgress")} {upload.name}</strong><span>{t("gallery.uploadSupport")}</span></div><strong className="upload-percent">{upload.progress}%</strong><div className="progress-track"><span style={{ width: `${upload.progress}%` }} /></div></div>
      ) : (
        <button className="upload-zone-button" type="button" onClick={openPicker}><span className="upload-orbit"><UploadCloud size={22} /></span><span className="upload-copy"><strong>{t("gallery.uploadHint")}</strong><span>{t("gallery.uploadSupport")}</span></span><span className="upload-arrow"><ArrowUp size={17} /></span></button>
      )}
      <div className="upload-zone-accent"><FileImage size={16} /> {t("gallery.uploadSupport")}</div>
    </section>
  );
}
