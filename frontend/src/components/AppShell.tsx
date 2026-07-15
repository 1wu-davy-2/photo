import type { ReactNode } from "react";
import { Aperture, CloudUpload, FolderKanban, Images, Languages, LayoutTemplate, LogOut, Palette, ShieldCheck, Users } from "lucide-react";

import type { Locale, Translator } from "../i18n";
import type { AppRoute } from "../routing";
import { routeHref } from "../routing";
import type { ColorTheme } from "../theme";
import type { UploadQueueState } from "../types/photo";
import { UploadQueuePanel } from "./UploadQueuePanel";

interface AppShellProps {
  total: number;
  username: string;
  role: string;
  locale: Locale;
  route: AppRoute;
  t: Translator;
  onLocaleChange: (locale: Locale) => void;
  onNavigate: (route: AppRoute) => void;
  onUpload: () => void;
  onLogout: () => void;
  theme: ColorTheme;
  onThemeChange: (theme: ColorTheme) => void;
  uploadQueue?: UploadQueueState | null;
  onPauseUpload?: () => void;
  onResumeUpload?: () => void;
  onDismissUpload?: () => void;
  onRetryUpload?: () => void;
  children: ReactNode;
}

export function AppShell({ total, username, role, locale, route, t, onLocaleChange, onNavigate, onUpload, onLogout, theme, onThemeChange, uploadQueue, onPauseUpload, onResumeUpload, onDismissUpload, onRetryUpload, children }: AppShellProps) {
  const links: { route: AppRoute; label: string; icon: typeof Images; adminOnly?: boolean }[] = [
    { route: "home", label: t("nav.home"), icon: Images },
    { route: "manage", label: t("nav.manage"), icon: FolderKanban },
    { route: "walls", label: t("nav.walls"), icon: LayoutTemplate },
    { route: "users", label: t("nav.users"), icon: Users, adminOnly: true },
  ];
  const currentLabel = links.find((link) => link.route === route)?.label ?? (route === "walls-editor" ? t("nav.walls") : t("nav.home"));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <a className="brand" href={routeHref("home")} aria-label="Lumen Archive home" onClick={() => onNavigate("home")}>
            <span className="brand-mark"><Aperture size={19} strokeWidth={2.4} /></span>
            <span className="brand-copy"><strong>Lumen Archive</strong><small>{t("brand.subtitle")}</small></span>
          </a>
          <span className="sidebar-kicker">PHOTO WORKSPACE</span>
          <nav className="route-nav" aria-label="Primary navigation">
            {links.filter((link) => !link.adminOnly || role === "admin").map(({ route: target, label, icon: Icon }) => (
              <a key={target} className={`route-link ${route === target || target === "walls" && route === "walls-editor" ? "is-active" : ""}`} href={routeHref(target)} onClick={() => onNavigate(target)} aria-current={route === target || target === "walls" && route === "walls-editor" ? "page" : undefined}>
                <Icon size={17} /> <span>{label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-setting"><span><Palette size={15} /> {t("nav.theme")}</span><div className="theme-switch" aria-label={t("nav.theme")}><button type="button" className={`theme-swatch theme-swatch-blue ${theme === "blue" ? "is-active" : ""}`} title="White-blue theme" aria-label="White-blue theme" onClick={() => onThemeChange("blue")}><span /></button><button type="button" className={`theme-swatch theme-swatch-pink ${theme === "pink" ? "is-active" : ""}`} title="White-pink theme" aria-label="White-pink theme" onClick={() => onThemeChange("pink")}><span /></button></div></div>
          <div className="sidebar-setting"><span><Languages size={15} /> {t("nav.language")}</span><div className="locale-switch" aria-label={t("nav.language")}><button type="button" className={locale === "zh-CN" ? "is-active" : ""} onClick={() => onLocaleChange("zh-CN")} aria-label="中文">中</button><button type="button" className={locale === "en-US" ? "is-active" : ""} onClick={() => onLocaleChange("en-US")} aria-label="English">EN</button></div></div>
          <div className="profile-card"><span className="profile-avatar"><ShieldCheck size={15} /></span><span className="profile-copy"><strong>{username}</strong><small>{role === "admin" ? t("users.admin") : t("users.user")}</small></span><button className="icon-button subtle" type="button" title={t("nav.logout")} aria-label={t("nav.logout")} onClick={onLogout}><LogOut size={16} /></button></div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar"><div className="breadcrumb"><span className="breadcrumb-overline">LUMEN ARCHIVE</span><strong>{currentLabel}</strong></div><div className="topbar-actions"><div className="archive-count" aria-label={`${total} ${t("gallery.count")}`}><Images size={16} /><span>{total.toLocaleString()}</span><small>{t("gallery.count")}</small></div><button className="button button-primary button-compact" type="button" onClick={onUpload}><CloudUpload size={17} /><span>{t("nav.upload")}</span></button></div></header>
        <main className="main-content">{children}</main>
        {uploadQueue && <UploadQueuePanel queue={uploadQueue} t={t} onPause={() => onPauseUpload?.()} onResume={() => onResumeUpload?.()} onDismiss={() => onDismissUpload?.()} onRetry={() => onRetryUpload?.()} />}
        <footer className="footer-note"><span>Lumen Archive</span><span>·</span><span>{t("brand.subtitle")}</span></footer>
      </div>
    </div>
  );
}
