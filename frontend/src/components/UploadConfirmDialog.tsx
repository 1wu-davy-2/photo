import { useState } from "react";
import { Images, UploadCloud, X } from "lucide-react";

import type { Translator } from "../i18n";

interface UploadConfirmDialogProps {
  fileCount: number;
  folderName?: string;
  t: Translator;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function UploadConfirmDialog({ fileCount, folderName, t, onCancel, onConfirm }: UploadConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onCancel(); }}>
    <section className="upload-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="upload-confirm-title">
      <div className="dialog-header">
        <div><span className="eyebrow"><UploadCloud size={14} /> {t("upload.confirmEyebrow")}</span><h2 id="upload-confirm-title">{t("upload.confirmTitle")}</h2></div>
        <button className="icon-button" type="button" title={t("upload.cancel")} aria-label={t("upload.cancel")} onClick={onCancel} disabled={isSubmitting}><X size={18} /></button>
      </div>
      <div className="upload-confirm-count"><Images size={22} /><strong>{fileCount}</strong><span>{` ${t("upload.photosDetected")}`}</span></div>
      <p className="dialog-copy">{folderName ? `${t("upload.folderSource")} ${folderName}` : t("upload.confirmDescription")}</p>
      <div className="dialog-actions"><button className="button button-ghost" type="button" onClick={onCancel} disabled={isSubmitting}>{t("upload.cancel")}</button><button className="button button-primary" type="button" onClick={() => void confirm()} disabled={isSubmitting}><UploadCloud size={16} />{isSubmitting ? t("upload.preparing") : t("upload.start")}</button></div>
    </section>
  </div>;
}
