export interface DroppedUpload {
  files: File[];
  folderName?: string;
}

interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}

interface FileSystemFileEntryLike extends FileSystemEntryLike {
  file: (callback: (file: File) => void, error?: (error: DOMException) => void) => void;
}

interface FileSystemDirectoryEntryLike extends FileSystemEntryLike {
  createReader: () => { readEntries: (callback: (entries: FileSystemEntryLike[]) => void, error?: (error: DOMException) => void) => void };
}

function getEntry(item: DataTransferItem): FileSystemEntryLike | null {
  return (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntryLike | null }).webkitGetAsEntry?.() ?? null;
}

function readFile(entry: FileSystemFileEntryLike): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function readDirectory(entry: FileSystemDirectoryEntryLike): Promise<File[]> {
  const reader = entry.createReader();
  const files: File[] = [];
  const readBatch = (): Promise<void> => new Promise((resolve, reject) => reader.readEntries(async (entries) => {
    if (entries.length === 0) { resolve(); return; }
    try {
      for (const child of entries) {
        if (child.isFile) files.push(await readFile(child as FileSystemFileEntryLike));
        if (child.isDirectory) files.push(...await readDirectory(child as FileSystemDirectoryEntryLike));
      }
      await readBatch();
      resolve();
    } catch (error) { reject(error); }
  }, reject));
  await readBatch();
  return files;
}

export async function collectDroppedUpload(dataTransfer: DataTransfer): Promise<DroppedUpload> {
  const entries = Array.from(dataTransfer.items).map(getEntry).filter((entry): entry is FileSystemEntryLike => Boolean(entry));
  if (entries.length === 0) return { files: Array.from(dataTransfer.files) };

  const files: File[] = [];
  const folderNames: string[] = [];
  for (const entry of entries) {
    if (entry.isFile) files.push(...await readFile(entry as FileSystemFileEntryLike).then((file) => [file]));
    if (entry.isDirectory) {
      folderNames.push(entry.name);
      files.push(...await readDirectory(entry as FileSystemDirectoryEntryLike));
    }
  }
  return { files, folderName: folderNames.length === 1 ? folderNames[0] : undefined };
}
