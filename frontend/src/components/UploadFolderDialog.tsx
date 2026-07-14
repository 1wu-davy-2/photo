import { useState } from "react";
import { Check, Folder, FolderPlus, X } from "lucide-react";

import type { Folder as FolderType } from "../types/photo";

interface UploadFolderDialogProps {
  folderName: string;
  fileCount: number;
  folders: FolderType[];
  onCancel: () => void;
  onConfirm: (folderId: string, createFolder: boolean) => Promise<void>;
}

export function UploadFolderDialog({ folderName, fileCount, folders, onCancel, onConfirm }: UploadFolderDialogProps) {
  const defaultFolder = folders.find((folder) => folder.is_default) ?? folders[0];
  const [parentId, setParentId] = useState(defaultFolder?.id ?? "");
  const [createFolder, setCreateFolder] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    if (!parentId) return;
    setIsSubmitting(true);
    setError("");
    try { await onConfirm(parentId, createFolder); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Upload failed"); } finally { setIsSubmitting(false); }
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="upload-folder-dialog" role="dialog" aria-modal="true" aria-labelledby="upload-folder-title"><div className="dialog-header"><div><span className="eyebrow"><Folder size={14} /> 文件夹上传</span><h2 id="upload-folder-title">检测到「{folderName}」</h2></div><button className="icon-button" type="button" title="关闭" aria-label="关闭" onClick={onCancel}><X size={18} /></button></div><p className="dialog-copy">发现 {fileCount} 个可上传图片。选择存放目录，或在目标目录下创建同名文件夹。</p><label className="dialog-check"><input type="checkbox" checked={createFolder} onChange={(event) => setCreateFolder(event.target.checked)} /><span><strong>创建同名文件夹</strong><small>上传到选中目录下的「{folderName}」文件夹</small></span><Check size={16} /></label><label className="dialog-field"><span>存放目录</span><div className="dialog-select"><Folder size={16} /><select value={parentId} onChange={(event) => setParentId(event.target.value)}>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}{folder.is_default ? "（默认）" : ""}</option>)}</select></div></label>{error && <div className="inline-error" role="alert">{error}</div>}<div className="dialog-actions"><button className="button button-ghost" type="button" onClick={onCancel}>取消</button><button className="button button-primary" type="button" disabled={isSubmitting || !parentId} onClick={() => void confirm()}>{createFolder ? <FolderPlus size={16} /> : <Check size={16} />}{isSubmitting ? "处理中" : "开始上传"}</button></div></section></div>;
}
