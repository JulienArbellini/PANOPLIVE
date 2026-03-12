"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Connexion impossible.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cursor-auto flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-black/40 p-6">
        <h1 className="text-2xl font-semibold">Admin Panoplive</h1>
        <p className="text-sm text-white/70">Connexion requise pour éditer le contenu du site.</p>

        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          Mot de passe
          <input
            className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
