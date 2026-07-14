import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ImagePlus, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";

import { createFolder, deletePhoto, listFolders, listPhotos, uploadPhoto } from "./api/client";
import { clearSession, loadSession, saveSession, type AuthSession } from "./auth/session";
import { AuthScreen } from "./components/AuthScreen";
import { AppShell } from "./components/AppShell";
import { FilterBar } from "./components/FilterBar";
import { GlobalDropUpload } from "./components/GlobalDropUpload";
import { ManagementPage } from "./components/ManagementPage";
import { PhotoGrid } from "./components/PhotoGrid";
import { PhotoLightbox } from "./components/PhotoLightbox";
import { PhotoWallPage } from "./components/PhotoWallPage";
import { PhotoWallLibraryPage } from "./components/PhotoWallLibraryPage";
import { PhotoWallSharePage } from "./components/PhotoWallSharePage";
import { UploadDropzone } from "./components/UploadDropzone";
import { UploadFolderDialog } from "./components/UploadFolderDialog";
import { UserManagementPage } from "./components/UserManagementPage";
import { loadLocale, saveLocale, translate, type Locale, type Translator } from "./i18n";
import { navigate, navigateToWallEditor, readRoute, readShareToken, readWallId, type AppRoute } from "./routing";
import { loadTheme, saveTheme, type ColorTheme } from "./theme";
import type { Folder, Photo, SortOrder, UploadState } from "./types/photo";
import { collectDroppedUpload } from "./upload";

function GalleryApp({ session, locale, t, route, onLocaleChange, onNavigate, onLogout, theme, onThemeChange, pendingDrop, onPendingDropHandled }: { session: AuthSession; locale: Locale; t: Translator; route: AppRoute; onLocaleChange: (locale: Locale) => void; onNavigate: (route: AppRoute) => void; onLogout: () => void; theme: ColorTheme; onThemeChange: (theme: ColorTheme) => void; pendingDrop: DataTransfer | null; onPendingDropHandled: () => void }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [uploadDialog, setUploadDialog] = useState<{ folderName: string; files: File[] } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const uploadOpenRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true); setError("");
    try { const result = await listPhotos(search, sort, "owned", session.accessToken); setPhotos(result.items); setTotal(result.total); setSelectedPhoto((current) => current && result.items.some((item) => item.id === current.id) ? current : null); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
    finally { setIsLoading(false); }
  }, [search, session.accessToken, sort, t]);

  useEffect(() => { const timer = window.setTimeout(() => void refresh(), search ? 160 : 0); return () => window.clearTimeout(timer); }, [refresh, search]);

  useEffect(() => {
    void listFolders("owned", session.accessToken).then(setFolders).catch(() => undefined);
  }, [session.accessToken]);

  const defaultFolderId = folders.find((folder) => folder.is_default)?.id ?? folders[0]?.id;

  const uploadFiles = async (files: FileList | File[], folderId?: string) => {
    const images = Array.from(files).filter((candidate) => candidate.type.startsWith("image/"));
    if (images.length === 0) { setError(t("gallery.uploadSupport")); return; }
    setError(""); setNotice("");
    try {
      for (const file of images) {
        setUpload({ name: file.name, progress: 0 });
        await uploadPhoto(file, (progress) => setUpload({ name: file.name, progress }), session.accessToken, folderId);
      }
      setNotice(`${images.length} ${t("gallery.uploadSuccess")}`);
      await refresh();
      const nextFolders = await listFolders("owned", session.accessToken);
      setFolders(nextFolders);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : t("manage.error")); }
    finally { setUpload(null); }
  };

  const handleFiles = (files: FileList | File[]) => {
    void uploadFiles(files, defaultFolderId);
  };

  const handleDataTransfer = async (dataTransfer: DataTransfer) => {
    const dropped = await collectDroppedUpload(dataTransfer);
    if (!dropped.folderName) { await uploadFiles(dropped.files, defaultFolderId); return; }
    if (folders.length > 0) { setUploadDialog({ folderName: dropped.folderName, files: dropped.files }); return; }
    try { setFolders(await listFolders("owned", session.accessToken)); setUploadDialog({ folderName: dropped.folderName, files: dropped.files }); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  useEffect(() => {
    if (!pendingDrop) return;
    onPendingDropHandled();
    void handleDataTransfer(pendingDrop);
  }, [pendingDrop]);

  const confirmFolderUpload = async (parentId: string, shouldCreate: boolean) => {
    if (!uploadDialog) return;
    const targetFolder = shouldCreate ? await createFolder({ name: uploadDialog.folderName, parent_id: parentId }, session.accessToken) : { id: parentId };
    await uploadFiles(uploadDialog.files, targetFolder.id);
    setUploadDialog(null);
  };

  const handleDelete = async () => {
    if (!selectedPhoto || !window.confirm(t("manage.confirmDelete"))) return;
    try { await deletePhoto(selectedPhoto.id, "owned", session.accessToken); setSelectedPhoto(null); setNotice(t("gallery.deleteSuccess")); await refresh(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : t("manage.error")); }
  };

  const selectedIndex = selectedPhoto ? photos.findIndex((photo) => photo.id === selectedPhoto.id) : -1;
  return (
    <AppShell total={total} username={session.user.username} role={session.user.role} locale={locale} route={route} t={t} onLocaleChange={onLocaleChange} onNavigate={onNavigate} onUpload={() => uploadOpenRef.current?.()} onLogout={onLogout} theme={theme} onThemeChange={onThemeChange}>
      <section className="hero-row"><div className="hero-copy"><span className="eyebrow"><span className="live-dot" /> {t("gallery.eyebrow")}</span><h1>{t("gallery.title")}</h1><p>{t("gallery.description")}</p></div><div className="hero-orbit" aria-hidden="true"><div className="orbit-ring orbit-ring-one" /><div className="orbit-ring orbit-ring-two" /><div className="orbit-core"><ImagePlus size={28} /></div><span className="orbit-label">ARCHIVE<br />ACTIVE</span></div></section>
      <UploadDropzone upload={upload} onFiles={handleFiles} onDataTransfer={handleDataTransfer} onChooseRef={(open) => { uploadOpenRef.current = open; }} t={t} />
      {(notice || error) && <div className={`status-banner ${error ? "status-error" : "status-success"}`} role="status">{error ? <TriangleAlert size={17} /> : <Check size={17} />}<span>{error || notice}</span>{error && <button type="button" className="icon-button subtle" title={t("common.dismiss")} aria-label={t("common.dismiss")} onClick={() => setError("")}><span aria-hidden="true">×</span></button>}</div>}
      <section className="archive-section"><div className="section-heading"><div><span className="eyebrow">{t("gallery.collection")}</span><h2>{t("gallery.collection")} <span>{total.toString().padStart(2, "0")}</span></h2></div><FilterBar search={search} sort={sort} onSearchChange={setSearch} onSortChange={setSort} t={t} /></div>
        {isLoading ? <div className="state-panel"><LoaderCircle className="spin" size={24} /><span>{t("gallery.loading")}</span></div> : error && photos.length === 0 ? <div className="state-panel state-error"><TriangleAlert size={23} /><strong>{t("manage.error")}</strong><span>{error}</span><button className="button button-ghost" type="button" onClick={() => void refresh()}><RefreshCw size={16} /> {t("common.retry")}</button></div> : photos.length === 0 ? <div className="empty-panel"><div className="empty-art" aria-hidden="true"><span /><span /><span /></div><span className="eyebrow">{search ? t("gallery.emptySearch") : t("gallery.eyebrow")}</span><h3>{search ? t("gallery.emptySearch") : t("gallery.emptyTitle")}</h3><p>{search ? t("gallery.emptySearchDescription") : t("gallery.emptyDescription")}</p>{!search && <button className="button button-primary" type="button" onClick={() => uploadOpenRef.current?.()}><ImagePlus size={17} /> {t("gallery.uploadFirst")}</button>}</div> : <PhotoGrid photos={photos} onSelect={setSelectedPhoto} t={t} accessToken={session.accessToken} />}
      </section>
      <div className="page-end-marker"><span /> Lumen Archive <span /></div>
      {selectedPhoto && <PhotoLightbox photo={selectedPhoto} hasPrevious={selectedIndex > 0} hasNext={selectedIndex >= 0 && selectedIndex < photos.length - 1} onClose={() => setSelectedPhoto(null)} onPrevious={() => selectedIndex > 0 && setSelectedPhoto(photos[selectedIndex - 1])} onNext={() => selectedIndex < photos.length - 1 && setSelectedPhoto(photos[selectedIndex + 1])} onDelete={() => void handleDelete()} t={t} accessToken={session.accessToken} />}
      {uploadDialog && <UploadFolderDialog folderName={uploadDialog.folderName} fileCount={uploadDialog.files.length} folders={folders} onCancel={() => setUploadDialog(null)} onConfirm={confirmFolderUpload} />}
    </AppShell>
  );
}

function ManagementShell({ session, locale, route, t, onLocaleChange, onNavigate, onLogout, theme, onThemeChange, children }: { session: AuthSession; locale: Locale; route: AppRoute; t: Translator; onLocaleChange: (locale: Locale) => void; onNavigate: (route: AppRoute) => void; onLogout: () => void; theme: ColorTheme; onThemeChange: (theme: ColorTheme) => void; children: ReactNode }) {
  return <AppShell total={0} username={session.user.username} role={session.user.role} locale={locale} route={route} t={t} onLocaleChange={onLocaleChange} onNavigate={onNavigate} onUpload={() => onNavigate("home")} onLogout={onLogout} theme={theme} onThemeChange={onThemeChange}>{children}</AppShell>;
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());
  const [locale, setLocale] = useState<Locale>(() => loadLocale());
  const [theme, setTheme] = useState<ColorTheme>(() => loadTheme());
  const [route, setRoute] = useState<AppRoute>(() => readRoute());
  const [pendingDrop, setPendingDrop] = useState<DataTransfer | null>(null);
  const t = translate(locale);
  const shareToken = readShareToken();
  const wallId = readWallId();

  useEffect(() => { const onHashChange = () => setRoute(readRoute()); window.addEventListener("hashchange", onHashChange); return () => window.removeEventListener("hashchange", onHashChange); }, []);
  useEffect(() => { const handleExpired = () => setSession(null); window.addEventListener("auth-expired", handleExpired); return () => window.removeEventListener("auth-expired", handleExpired); }, []);
  useEffect(() => { if (!session) return; const timeout = window.setTimeout(() => { clearSession(); setSession(null); }, Math.max(0, session.expiresAt - Date.now())); return () => window.clearTimeout(timeout); }, [session]);
  useEffect(() => { document.documentElement.dataset.theme = theme; saveTheme(theme); }, [theme]);

  const changeLocale = (nextLocale: Locale) => { saveLocale(nextLocale); setLocale(nextLocale); };
  const changeTheme = (nextTheme: ColorTheme) => setTheme(nextTheme);
  const changeRoute = (nextRoute: AppRoute) => { navigate(nextRoute); setRoute(nextRoute); };
  const logout = () => { clearSession(); setSession(null); changeRoute("home"); };
  const handleGlobalDrop = (dataTransfer: DataTransfer) => { setPendingDrop(dataTransfer); if (route !== "home") changeRoute("home"); };
  const withGlobalDrop = (content: ReactNode) => route === "home" || route === "manage" ? <><GlobalDropUpload onDrop={handleGlobalDrop} />{content}</> : content;

  if (shareToken) return <PhotoWallSharePage token={shareToken} />;
  if (!session) return <AuthScreen t={t} onAuthenticated={(nextSession) => { saveSession(nextSession); setSession(nextSession); changeRoute("home"); }} />;
  const isAdmin = session.user.role === "admin";
  if (route === "walls") return withGlobalDrop(<ManagementShell session={session} locale={locale} route={route} t={t} onLocaleChange={changeLocale} onNavigate={changeRoute} onLogout={logout} theme={theme} onThemeChange={changeTheme}><PhotoWallLibraryPage t={t} accessToken={session.accessToken} onCreate={() => navigateToWallEditor(null)} onOpen={(id) => navigateToWallEditor(id)} /></ManagementShell>);
  if (route === "walls-editor") return withGlobalDrop(<ManagementShell session={session} locale={locale} route={route} t={t} onLocaleChange={changeLocale} onNavigate={changeRoute} onLogout={logout} theme={theme} onThemeChange={changeTheme}><PhotoWallPage t={t} accessToken={session.accessToken} wallId={wallId} onBack={() => changeRoute("walls")} /></ManagementShell>);
  if (route === "users" && isAdmin) return withGlobalDrop(<ManagementShell session={session} locale={locale} route={route} t={t} onLocaleChange={changeLocale} onNavigate={changeRoute} onLogout={logout} theme={theme} onThemeChange={changeTheme}><UserManagementPage t={t} accessToken={session.accessToken} /></ManagementShell>);
  if (route === "manage") return withGlobalDrop(<ManagementShell session={session} locale={locale} route={route} t={t} onLocaleChange={changeLocale} onNavigate={changeRoute} onLogout={logout} theme={theme} onThemeChange={changeTheme}><ManagementPage t={t} isAdmin={isAdmin} accessToken={session.accessToken} /></ManagementShell>);
  return withGlobalDrop(<GalleryApp session={session} locale={locale} t={t} route="home" onLocaleChange={changeLocale} onNavigate={changeRoute} onLogout={logout} theme={theme} onThemeChange={changeTheme} pendingDrop={pendingDrop} onPendingDropHandled={() => setPendingDrop(null)} />);
}

export default App;
