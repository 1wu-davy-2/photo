import { Check, CircleAlert, Pause, Play, RotateCcw, UploadCloud, X } from "lucide-react";

import type { Translator } from "../i18n";
import type { UploadQueueState } from "../types/photo";

interface UploadQueuePanelProps {
  queue: UploadQueueState;
  t: Translator;
  onPause: () => void;
  onResume: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}

export function UploadQueuePanel({ queue, t, onPause, onResume, onDismiss, onRetry }: UploadQueuePanelProps) {
  const isComplete = queue.completed >= queue.total;
  const title = queue.isPaused ? t("upload.paused") : isComplete ? t("upload.complete") : t("upload.uploading");
  const percent = isComplete ? 100 : Math.round(((queue.completed + queue.currentProgress / 100) / Math.max(1, queue.total)) * 100);

  return <aside className={`upload-queue-panel ${queue.isPaused ? "is-paused" : ""} ${isComplete ? "is-complete" : ""}`} role="status" aria-live="polite">
    <div className="upload-queue-header"><span className="upload-queue-heading"><span className="upload-queue-icon"><UploadCloud size={16} /></span><strong>{title}</strong></span><button className="icon-button subtle" type="button" title={t("upload.dismiss")} aria-label={t("upload.dismiss")} onClick={onDismiss} disabled={!isComplete && !queue.isPaused}><X size={15} /></button></div>
    <div className="upload-queue-summary"><span>{queue.completed} / {queue.total} {t("upload.files")}</span><strong>{percent}%</strong></div>
    <div className="progress-track upload-queue-track"><span style={{ width: `${percent}%` }} /></div>
    <div className="upload-queue-file"><span>{queue.currentName || (isComplete ? t("upload.completeDescription") : t("upload.waiting"))}</span>{queue.failed > 0 && <span className="upload-queue-failed"><CircleAlert size={13} /> {queue.failed} {t("upload.failed")}</span>}</div>
    <div className="upload-queue-actions">{isComplete && queue.failed > 0 && <button className="button button-ghost" type="button" onClick={onRetry}><RotateCcw size={14} /> {t("upload.retry")}</button>}{!isComplete && <button className="button button-soft" type="button" aria-label={queue.isPaused ? t("upload.resumeAction") : t("upload.pauseAction")} onClick={queue.isPaused ? onResume : onPause}>{queue.isPaused ? <Play size={14} /> : <Pause size={14} />} {queue.isPaused ? t("upload.resume") : t("upload.pause")}</button>}{isComplete && queue.failed === 0 && <span className="upload-queue-done"><Check size={14} /> {t("upload.complete")}</span>}</div>
  </aside>;
}
