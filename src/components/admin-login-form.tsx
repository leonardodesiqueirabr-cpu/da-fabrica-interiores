"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Erro ao autenticar");
      }

      router.push("/admin");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h1 className="text-2xl font-semibold">Acesso administrativo</h1>
      <p className="text-sm text-[var(--muted)]">Use as credenciais do administrador do site.</p>

      <label className="block space-y-1 text-sm">
        <span>Usuário</span>
        <input
          type="text"
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>Senha</span>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-[var(--border)] px-3 py-2"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
