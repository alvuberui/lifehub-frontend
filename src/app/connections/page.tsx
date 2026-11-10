"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Permission = "NONE" | "SUMMARY_READ" | "DETAIL_READ" | "EDIT" | "ADMIN";
type UserSearch = { email: string; name: string; lastname: string; connected: boolean; requestPending: boolean };
type Connection = { id: number; email: string; name: string; lastname: string; connectedAt: string; grantedByMe: Record<string, Permission>; grantedToMe: Record<string, Permission> };
type Request = { id: number; requesterEmail: string; requesterName: string; requesterLastname: string; recipientEmail: string; recipientName: string; recipientLastname: string; status: string; createdAt: string; incoming: boolean };
type Overview = { connections: Connection[]; pendingRequests: Request[] };

const modules = [
  ["finance", "Finanzas"],
  ["home", "Hogar"],
  ["travel", "Travel"],
  ["tasks", "Tareas"],
  ["vehicle", "Vehículo"],
  ["shopping", "Compras"],
  ["documents", "Documentos"],
] as const;

const permissionLabels: Record<Permission, string> = {
  NONE: "No compartir",
  SUMMARY_READ: "Ver resumen",
  DETAIL_READ: "Ver detalles",
  EDIT: "Ver y editar",
  ADMIN: "Administrador",
};

function permissionOptions(module: string): Permission[] {
  return module === "home" ? ["NONE", "ADMIN"] : ["NONE", "SUMMARY_READ", "DETAIL_READ", "EDIT", "ADMIN"];
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const payload = await response.json().catch(() => null) as { ok?: boolean; data?: T; error?: { message?: string } } | null;
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error?.message ?? "No se pudo completar la operación.");
  return (payload?.data ?? payload) as T;
}

function displayName(name: string, lastname: string, email: string) {
  const fullName = `${name} ${lastname}`.trim();
  return fullName || email;
}

export default function ConnectionsPage() {
  const [overview, setOverview] = useState<Overview>({ connections: [], pendingRequests: [] });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setOverview(await requestJson<Overview>("/api/connections"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error cargando las conexiones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // La carga inicial sincroniza la pantalla con la API autenticada.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function search(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    try {
      setResults(await requestJson<UserSearch[]>(`/api/connections/search?query=${encodeURIComponent(query.trim())}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error buscando usuarios.");
    }
  }

  async function sendRequest(email: string) {
    await runAction(`request:${email}`, async () => {
      await requestJson("/api/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipientEmail: email }) });
      setNotice("Solicitud enviada correctamente.");
      setResults((current) => current.map((user) => user.email === email ? { ...user, requestPending: true } : user));
      await load();
    });
  }

  async function requestAction(id: number, action: "accept" | "reject" | "cancel") {
    await runAction(`${action}:${id}`, async () => {
      await requestJson(`/api/connections/requests/${id}/${action}`, { method: "POST" });
      setNotice(action === "accept" ? "Conexión aceptada." : "Solicitud actualizada.");
      await load();
    });
  }

  async function removeConnection(connection: Connection) {
    if (!window.confirm(`¿Eliminar la conexión con ${displayName(connection.name, connection.lastname, connection.email)}?`)) return;
    await runAction(`remove:${connection.id}`, async () => {
      await requestJson(`/api/connections/${connection.id}`, { method: "DELETE" });
      setNotice("Conexión eliminada. Sus datos siguen intactos y privados.");
      await load();
    });
  }

  async function blockConnection(connection: Connection) {
    if (!window.confirm("Al bloquear a esta persona se eliminará también la conexión actual.")) return;
    await runAction(`block:${connection.id}`, async () => {
      await requestJson("/api/connections/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: connection.email }) });
      setNotice("Usuario bloqueado.");
      await load();
    });
  }

  async function updatePermission(connection: Connection, module: string, permission: Permission) {
    await runAction(`permission:${connection.id}:${module}`, async () => {
      await requestJson(`/api/connections/${connection.id}/permissions`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module, permission }) });
      setOverview((current) => ({ ...current, connections: current.connections.map((item) => item.id === connection.id ? { ...item, grantedByMe: { ...item.grantedByMe, [module]: permission } } : item) }));
    });
  }

  async function runAction(key: string, action: () => Promise<void>) {
    try {
      setBusy(key);
      setError(null);
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo completar la operación.");
    } finally {
      setBusy(null);
    }
  }

  const incoming = overview.pendingRequests.filter((request) => request.incoming);
  const outgoing = overview.pendingRequests.filter((request) => !request.incoming);

  return (
    <main className="app-shell min-h-screen px-4 py-8 text-slate-100 sm:px-6 lg:px-8 lg:py-12">
      <div className="fade-up mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-4"><Link href="/dashboard" className="text-sm font-semibold text-cyan-200 hover:text-white">← Volver a LifeHub</Link><Link href="/shared-spaces" className="text-sm font-semibold text-violet-200 hover:text-white">Gestionar espacios →</Link></div>
            <p className="eyebrow mt-7">LifeHub / Comunidad</p>
            <h1 className="page-title mt-2 text-4xl font-black tracking-tight sm:text-6xl">Tus conexiones</h1>
            <p className="mt-3 max-w-2xl text-slate-400">Decide con quién compartes cada parte de tu vida. Aceptar una conexión no da acceso automático a ningún módulo.</p>
          </div>
          <div className="surface-soft rounded-2xl px-4 py-3 text-sm text-slate-300"><span className="font-black text-white">{overview.connections.length}</span> conexiones activas</div>
        </header>

        {error ? <div className="notice notice-error"><span className="notice-mark">!</span><span>{error}</span></div> : null}
        {notice ? <div className="notice notice-success"><span className="notice-mark">✓</span><span>{notice}</span></div> : null}

        <section className="surface rounded-[1.75rem] p-5 sm:p-7">
          <div>
            <p className="eyebrow">Añadir conexión</p>
            <h2 className="mt-1 text-2xl font-black text-white">Encuentra a alguien</h2>
            <p className="mt-2 text-sm text-slate-400">Busca por email, nombre o apellidos. Solo las personas que acepten compartir aparecerán en tus módulos.</p>
          </div>
          <form onSubmit={search} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full flex-1 rounded-2xl border border-white/10 bg-[#081525]/80 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300/50" placeholder="Ej. laura@email.com" aria-label="Buscar usuario" />
            <button className="rounded-2xl bg-cyan-300 px-5 py-3 font-black text-slate-950 hover:bg-cyan-200">Buscar</button>
          </form>
          {results.length > 0 ? <div className="mt-5 divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08]">{results.map((user) => <div key={user.email} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-white">{displayName(user.name, user.lastname, user.email)}</p><p className="text-sm text-slate-500">{user.email}</p></div>{user.connected ? <span className="text-sm font-semibold text-emerald-300">Ya estáis conectados</span> : user.requestPending ? <span className="text-sm font-semibold text-amber-200">Solicitud pendiente</span> : <button type="button" disabled={busy === `request:${user.email}`} onClick={() => void sendRequest(user.email)} className="rounded-xl border border-cyan-300/20 px-3 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-300/10 disabled:opacity-50">{busy === `request:${user.email}` ? "Enviando…" : "Enviar solicitud"}</button>}</div>)}</div> : null}
        </section>

        {loading ? <div className="surface rounded-[1.75rem] p-12 text-center text-sm text-slate-400">Cargando conexiones…</div> : null}

        {!loading && incoming.length > 0 ? <section className="surface rounded-[1.75rem] p-5 sm:p-7"><div className="flex items-end justify-between gap-3"><div><p className="eyebrow">Solicitudes recibidas</p><h2 className="mt-1 text-2xl font-black text-white">Personas que quieren conectar</h2></div><span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">{incoming.length} pendientes</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{incoming.map((request) => <div key={request.id} className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4"><p className="font-bold text-white">{displayName(request.requesterName, request.requesterLastname, request.requesterEmail)}</p><p className="mt-1 text-sm text-slate-500">{request.requesterEmail}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy === `accept:${request.id}`} onClick={() => void requestAction(request.id, "accept")} className="rounded-xl bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50">Aceptar</button><button type="button" disabled={busy === `reject:${request.id}`} onClick={() => void requestAction(request.id, "reject")} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.06] disabled:opacity-50">Rechazar</button></div></div>)}</div></section> : null}

        {!loading && outgoing.length > 0 ? <section className="surface rounded-[1.75rem] p-5 sm:p-7"><p className="eyebrow">Solicitudes enviadas</p><h2 className="mt-1 text-2xl font-black text-white">Esperando respuesta</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{outgoing.map((request) => <div key={request.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] p-4"><div className="min-w-0"><p className="truncate font-bold text-white">{displayName(request.recipientName, request.recipientLastname, request.recipientEmail)}</p><p className="truncate text-sm text-slate-500">{request.recipientEmail}</p></div><button type="button" disabled={busy === `cancel:${request.id}`} onClick={() => void requestAction(request.id, "cancel")} className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-300/10 disabled:opacity-50">Cancelar</button></div>)}</div></section> : null}

        {!loading && overview.connections.length === 0 && incoming.length === 0 && outgoing.length === 0 ? <div className="surface rounded-[1.75rem] border-dashed p-12 text-center"><p className="text-4xl">◎</p><h2 className="mt-4 text-xl font-black text-white">Todavía no tienes conexiones</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Busca a alguien para empezar a compartir módulos de LifeHub de forma controlada.</p></div> : null}

        {overview.connections.length > 0 ? <section className="space-y-4"><div><p className="eyebrow">Permisos por módulo</p><h2 className="mt-1 text-2xl font-black text-white">Qué compartes con cada persona</h2><p className="mt-2 text-sm text-slate-400">Estos permisos solo afectan a tus datos y pueden cambiarse o revocarse en cualquier momento.</p></div>{overview.connections.map((connection) => <article key={connection.id} className="surface min-w-0 rounded-[1.75rem] p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-xl font-black text-white">{displayName(connection.name, connection.lastname, connection.email)}</h3><p className="mt-1 text-sm text-slate-500">{connection.email}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void removeConnection(connection)} className="rounded-xl px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-300/10">Eliminar conexión</button><button type="button" onClick={() => void blockConnection(connection)} className="rounded-xl border border-rose-300/20 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-300/10">Bloquear</button></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modules.map(([module, label]) => <div key={module} className="rounded-2xl border border-white/[0.08] bg-black/10 p-3"><label className="block text-xs font-bold uppercase tracking-wider text-slate-500">{label}<select value={connection.grantedByMe[module] ?? "NONE"} onChange={(event) => void updatePermission(connection, module, event.target.value as Permission)} disabled={busy === `permission:${connection.id}:${module}`} className="mt-2 w-full rounded-xl border border-white/10 bg-[#081525] px-3 py-2 text-sm font-semibold text-white outline-none">{permissionOptions(module).map((permission) => <option key={permission} value={permission}>{module === "home" && permission === "ADMIN" ? "Hogar compartido" : permissionLabels[permission]}</option>)}</select></label><p className="mt-2 text-[0.7rem] text-slate-600">Te comparte: <span className="text-slate-400">{permissionLabels[connection.grantedToMe[module] ?? "NONE"]}</span></p></div>)}</div></article>)}</section> : null}
      </div>
    </main>
  );
}
