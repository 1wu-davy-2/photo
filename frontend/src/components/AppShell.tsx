import type { ReactNode } from "react";
import { Aperture, CloudUpload, FolderCog, Images, Languages, LogOut, ShieldCheck, Users } from "lucide-react";

import type { Locale, Translator } from "../i18n";
import type { AppRoute } from "../routing";
import { routeHref } from "../routing";

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
  children: ReactNode;
}

export function AppShell({ total, username, role, locale, route, t, onLocaleChange, onNavigate, onUpload, onLogout, children }: AppShellProps) {
  const links: { route: AppRoute; label: string; icon: typeof Images; adminOnly?: boolean }[] = [
    { route: "home", label: t("nav.home"), icon: Images },
    { route: "manage", label: t("nav.manage"), icon: FolderCog },
    { route: "users", label: t("nav.users"), icon: Users, adminOnly: true },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href={routeHref("home")} aria-label="Lumen Archive home" onClick={() => onNavigate("home")}>
          <span className="brand-mark"><Aperture size={19} strokeWidth={2.4} /></span>
          <span><strong>Lumen</strong><small>{t("brand.subtitle")}</small></span>
        </a>
        <nav className="route-nav" aria-label="Primary navigation">
          {links.filter((link) => !link.adminOnly || role === "admin").map(({ route: target, label, icon: Icon }) => (
            <a key={target} className={`route-link ${route === target ? "is-active" : ""}`} href={routeHref(target)} onClick={() => onNavigate(target)}>
              <Icon size={15} /> <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="topbar-actions">
          <div className="locale-switch" aria-label={t("nav.language")}>
            <Languages size={15} />
            <button type="button" className={locale === "zh-CN" ? "is-active" : ""} onClick={() => onLocaleChange("zh-CN")} aria-label="中文">中</button>
            <button type="button" className={locale === "en-US" ? "is-active" : ""} onClick={() => onLocaleChange("en-US")} aria-label="English">EN</button>
          </div>
          <div className="archive-count" aria-label={`${total} ${t("gallery.count")}`}><Images size={16} /><span>{total.toLocaleString()}</span><small>{t("gallery.count")}</small></div>
          <button className="button button-primary button-compact" type="button" onClick={onUpload}><CloudUpload size={17} /><span>{t("nav.upload")}</span></button>
          <div className="user-actions"><span className="user-name"><ShieldCheck size={13} />{username}</span><button className="icon-button subtle" type="button" title={t("nav.logout")} aria-label={t("nav.logout")} onClick={onLogout}><LogOut size={17} /></button></div>
        </div>
      </header>
      <main className="main-content">{children}</main>
      <footer className="footer-note"><span>Lumen Archive</span><span>·</span><span>{t("brand.subtitle")}</span></footer>
    </div>
  );
}
