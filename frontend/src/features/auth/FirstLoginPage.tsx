import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";

export function FirstLoginPage() {
  const { user, changeOwnPassword } = useSession();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (!user) return <Navigate to="/login" replace />;

  const rules = [
    ["At least 12 characters", password.length >= 12],
  ] as const;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!currentPassword || !rules.every(([, met]) => met) || password !== confirm) {
      setError("Enter your current password, use at least 12 characters, and enter the same new password twice.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await changeOwnPassword(currentPassword, password);
      navigate("/", { replace: true });
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "The password could not be changed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <section className="w-full max-w-lg rounded-lg border border-border bg-white p-8 shadow-card">
        <h1 className="text-2xl font-semibold">New password</h1>
        <p className="mt-2 text-sm text-text-secondary">For security, verify your temporary password and set a new one before continuing.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium">Current temporary password
            <input autoFocus required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} disabled={saving} />
          </label>
          <label className="block text-sm font-medium">New password
            <input required minLength={12} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} disabled={saving} />
          </label>
          <label className="block text-sm font-medium">Confirm new password
            <input required minLength={12} autoComplete="new-password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className={inputClass} disabled={saving} />
          </label>
          <ul className="space-y-1 text-sm">{rules.map(([rule, met]) => <li key={rule} className={met ? "text-brand-green-dark" : "text-text-secondary"}>{met ? "✓" : "○"} {rule}</li>)}</ul>
          {error && <p role="alert" className="text-sm text-status-error">{error}</p>}
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save new password"}</Button>
        </form>
      </section>
    </main>
  );
}

const inputClass = "mt-1 h-11 w-full rounded-md border border-border px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green-dark";
