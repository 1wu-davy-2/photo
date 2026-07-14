import { FormEvent, useState } from "react";
import { ArrowRight, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";

import { login } from "../api/client";
import type { AuthSession } from "../auth/session";
import type { Translator } from "../i18n";

interface AuthScreenProps {
  onAuthenticated: (session: AuthSession) => void;
  t: Translator;
}

export function AuthScreen({ onAuthenticated, t }: AuthScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      onAuthenticated(await login(username.trim(), password));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <div className="auth-panel">
        <div className="auth-emblem"><ShieldCheck size={26} /></div>
        <span className="eyebrow"><span className="live-dot" /> Lumen Archive · {t("auth.privateAccess")}</span>
        <h1>{t("auth.title")}</h1>
        <p className="auth-intro">{t("auth.description")}</p>
        <form className="auth-form" onSubmit={submit}>
          <label><span>{t("auth.username")}</span><input aria-label={`${t("auth.username")} / Username`} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
          <label><span>{t("auth.password")}</span><div className="password-field"><KeyRound size={16} /><input aria-label={`${t("auth.password")} / Password`} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div></label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}<span>{isSubmitting ? t("auth.checking") : t("auth.submit")}</span></button>
        </form>
        <div className="auth-footnote"><span /> {t("auth.expiry")} <span /></div>
      </div>
    </main>
  );
}
