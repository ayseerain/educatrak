import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";

export function FirstLoginPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  if (!user) return <Navigate to="/login" replace />;
  const rules = [["At least 12 characters", password.length >= 12], ["An uppercase letter", /[A-Z]/.test(password)], ["A lowercase letter", /[a-z]/.test(password)], ["A number", /\d/.test(password)], ["A symbol", /[^A-Za-z0-9]/.test(password)]] as const;
  function submit(event: FormEvent) { event.preventDefault(); if (!rules.every(([, met]) => met) || password !== confirm) { setError("Meet every password rule and enter the same password twice."); return; } navigate("/"); }
  return <main className="flex min-h-screen items-center justify-center bg-surface p-6"><section className="w-full max-w-lg rounded-lg border bg-white p-8 shadow-card"><h1 className="text-2xl font-semibold">Set a new password</h1><p className="mt-2 text-sm text-text-secondary">For security, change your temporary password before continuing.</p><form className="mt-6 space-y-4" onSubmit={submit}><label className="block text-sm font-medium">New password<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-11 w-full rounded-md border px-3" /></label><label className="block text-sm font-medium">Confirm new password<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-1 h-11 w-full rounded-md border px-3" /></label><ul className="space-y-1 text-sm">{rules.map(([rule, met]) => <li key={rule} className={met ? "text-brand-green-dark" : "text-text-secondary"}>{met ? "✓" : "○"} {rule}</li>)}</ul>{error && <p role="alert" className="text-sm text-status-error">{error}</p>}<Button>Save new password</Button></form></section></main>;
}
