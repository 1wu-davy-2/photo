import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, LockKeyhole, Plus, Shield, Trash2, UserRound, X } from "lucide-react";

import { createUser, deleteUser, listUsers, updateUser } from "../api/client";
import type { Translator } from "../i18n";
import type { ManagedUser } from "../types/photo";

export function UserManagementPage({ t, accessToken }: { t: Translator; accessToken: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try { setUsers(await listUsers(accessToken)); setError(""); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); } finally { setIsLoading(false); }
  }, [accessToken, t]);

  useEffect(() => { void refresh(); }, [refresh]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await createUser({ username: username.trim(), password, role }, accessToken);
      setUsername(""); setPassword(""); setRole("user"); await refresh();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  const toggleStatus = async (user: ManagedUser) => {
    try { await updateUser(user.id, { is_active: !user.is_active }, accessToken); await refresh(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  const remove = async (user: ManagedUser) => {
    if (!window.confirm(t("manage.confirmDelete"))) return;
    try { await deleteUser(user.id, accessToken); await refresh(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("manage.error")); }
  };

  return (
    <section className="workspace-page">
      <div className="page-heading"><div><span className="eyebrow"><span className="live-dot" /> {t("users.eyebrow")}</span><h1>{t("users.title")}</h1><p>{t("users.description")}</p></div><div className="page-heading-mark"><Shield size={34} /></div></div>
      <div className="management-layout users-layout">
        <form className="control-panel create-user-panel" onSubmit={submit}>
          <div className="panel-heading"><div><span className="eyebrow">01</span><h2>{t("users.create")}</h2></div><Plus size={20} /></div>
          <label><span>{t("users.username")}</span><div className="input-with-icon"><UserRound size={16} /><input value={username} onChange={(event) => setUsername(event.target.value)} required /></div></label>
          <label><span>{t("users.password")}</span><div className="input-with-icon"><LockKeyhole size={16} /><input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div></label>
          <label><span>{t("users.role")}</span><select value={role} onChange={(event) => setRole(event.target.value as "admin" | "user")}><option value="user">{t("users.user")}</option><option value="admin">{t("users.admin")}</option></select></label>
          <button className="button button-primary" type="submit"><Plus size={16} />{t("users.create")}</button>
          {error && <div className="inline-error" role="alert">{error}</div>}
        </form>
        <div className="control-panel table-panel">
          <div className="panel-heading"><div><span className="eyebrow">02</span><h2>{t("users.title")}</h2></div><span className="panel-count">{users.length}</span></div>
          {isLoading ? <div className="table-state"><LoaderCircle className="spin" size={20} /></div> : users.length === 0 ? <div className="table-state">{t("users.noUsers")}</div> : <div className="data-table users-table"><div className="table-row table-header"><span>{t("users.username")}</span><span>{t("users.role")}</span><span>{t("users.status")}</span><span>{t("users.actions")}</span></div>{users.map((user) => <div className="table-row" key={user.id}><strong>{user.username}</strong><span className="role-chip"><Shield size={13} />{user.role === "admin" ? t("users.admin") : t("users.user")}</span><span className={`status-chip ${user.is_active ? "is-active" : ""}`}>{user.is_active ? <Check size={13} /> : <X size={13} />}{user.is_active ? t("users.active") : t("users.disabled")}</span><span className="row-actions"><button className="icon-button subtle" type="button" title={user.is_active ? t("users.disable") : t("users.enable")} aria-label={user.is_active ? t("users.disable") : t("users.enable")} onClick={() => void toggleStatus(user)}>{user.is_active ? <X size={16} /> : <Check size={16} />}</button><button className="icon-button subtle danger-icon" type="button" title={t("users.delete")} aria-label={t("users.delete")} onClick={() => void remove(user)}><Trash2 size={16} /></button></span></div>)}</div>}
        </div>
      </div>
    </section>
  );
}
