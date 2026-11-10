"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Permission = "NONE" | "SUMMARY_READ" | "DETAIL_READ" | "EDIT" | "ADMIN";
type Space = { id: number; name: string; description: string | null; ownerEmail: string; members: Array<{ email: string; role: string }>; permissions: Record<string, Permission> };

const modules: Array<[string, string]> = [["finance", "Finanzas"], ["home", "Hogar"], ["travel", "Viajes"], ["tasks", "Tareas"], ["vehicle", "Vehículo"], ["shopping", "Compras"], ["documents", "Documentos"]];
const permissionLabels: Record<Permission, string> = { NONE: "No compartir", SUMMARY_READ: "Resumen", DETAIL_READ: "Detalle", EDIT: "Editar", ADMIN: "Administrar" };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const payload = await response.json().catch(() => null) as { ok?: boolean; data?: T; error?: { message?: string } } | null;
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error?.message ?? "No se pudo completar la operación.");
  return (payload?.data ?? payload) as T;
}

export default function SharedSpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberEmails, setMemberEmails] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try { setLoading(true); setSpaces(await api<Space[]>("/api/shared-spaces")); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Error cargando espacios."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    // Carga inicial de la lista autenticada.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/shared-spaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
      setName(""); setDescription(""); setNotice("Espacio creado."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Error creando el espacio."); }
  }

  async function addMember(spaceId: number) {
    const email = memberEmails[spaceId]?.trim();
    if (!email) return;
    try {
      await api(`/api/shared-spaces/${spaceId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role: "MEMBER" }) });
      setMemberEmails((current) => ({ ...current, [spaceId]: "" })); setNotice("Miembro añadido al espacio."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Error añadiendo al miembro."); }
  }

  async function removeMember(spaceId: number, email: string) {
    if (!window.confirm(`¿Quitar a ${email} del espacio?`)) return;
    try { await api(`/api/shared-spaces/${spaceId}/members?email=${encodeURIComponent(email)}`, { method: "DELETE" }); setNotice("Miembro eliminado."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Error quitando al miembro."); }
  }

  async function removeSpace(space: Space) {
    if (!window.confirm(`¿Eliminar el espacio «${space.name}»?`)) return;
    try { await api(`/api/shared-spaces/${space.id}`, { method: "DELETE" }); setNotice("Espacio eliminado."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Error eliminando el espacio."); }
  }

  async function updatePermission(space: Space, module: string, permission: Permission) {
    try {
      await api(`/api/shared-spaces/${space.id}/permissions`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module, permission }) });
      setSpaces((current) => current.map((item) => item.id === space.id ? { ...item, permissions: { ...item.permissions, [module]: permission } } : item));
      setNotice("Permiso del espacio actualizado.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Error actualizando el permiso."); }
  }

  return <main className="app-shell min-h-screen px-4 py-8 text-slate-100 sm:px-6 lg:px-8 lg:py-12"><div className="fade-up mx-auto max-w-6xl space-y-8"><header><Link href="/connections" className="text-sm font-semibold text-cyan-200 hover:text-white">← Volver a conexiones</Link><p className="eyebrow mt-7">LifeHub / Colaboración</p><h1 className="page-title mt-2 text-4xl font-black tracking-tight sm:text-6xl">Espacios compartidos</h1><p className="mt-3 max-w-2xl text-slate-400">Agrupa conexiones para representar una casa, una familia o unas finanzas comunes. Crear un espacio no comparte datos por sí solo.</p></header>{error ? <div className="notice notice-error"><span className="notice-mark">!</span><span>{error}</span></div> : null}{notice ? <div className="notice notice-success"><span className="notice-mark">✓</span><span>{notice}</span></div> : null}<section className="surface rounded-[1.75rem] p-5 sm:p-7"><p className="eyebrow">Nuevo espacio</p><h2 className="mt-1 text-2xl font-black text-white">Crea un contexto compartido</h2><form onSubmit={create} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]"><input required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081525] px-4 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Ej. Finanzas familiares" /><input value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081525] px-4 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Descripción opcional" /><button className="rounded-2xl bg-cyan-300 px-5 py-3 font-black text-slate-950 hover:bg-cyan-200">Crear espacio</button></form></section>{loading ? <div className="surface rounded-[1.75rem] p-12 text-center text-sm text-slate-400">Cargando espacios…</div> : spaces.length === 0 ? <div className="surface rounded-[1.75rem] border-dashed p-12 text-center"><p className="text-4xl">◇</p><h2 className="mt-4 text-xl font-black text-white">Aún no tienes espacios</h2><p className="mt-2 text-sm text-slate-500">Cuando quieras organizar una colaboración, créala aquí.</p></div> : <section className="grid gap-5 lg:grid-cols-2">{spaces.map((space) => <article key={space.id} className="surface min-w-0 rounded-[1.75rem] p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-xl font-black text-white">{space.name}</h2><p className="mt-1 text-sm text-slate-400">{space.description || "Sin descripción"}</p></div><button type="button" onClick={() => void removeSpace(space)} className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-300/10">Eliminar</button></div><div className="mt-6"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Miembros</p><div className="mt-3 space-y-2">{space.members.map((member) => <div key={member.email} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/10 px-3 py-2"><span className="min-w-0 truncate text-sm text-slate-300">{member.email}</span><span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wider text-cyan-200">{member.role}</span>{member.role !== "OWNER" ? <button type="button" onClick={() => void removeMember(space.id, member.email)} className="shrink-0 text-xs font-bold text-rose-200">Quitar</button> : null}</div>)}</div><div className="mt-4 flex gap-2"><input value={memberEmails[space.id] ?? ""} onChange={(event) => setMemberEmails((current) => ({ ...current, [space.id]: event.target.value }))} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#081525] px-3 py-2 text-sm text-white outline-none" placeholder="Email de una conexión" /><button type="button" onClick={() => void addMember(space.id)} className="rounded-xl border border-cyan-300/20 px-3 py-2 text-xs font-bold text-cyan-200">Añadir</button></div><p className="mt-3 text-xs leading-5 text-slate-600">Solo puedes añadir conexiones aceptadas. Los permisos de módulos se configuran de forma independiente.</p><div className="mt-6 border-t border-white/[0.08] pt-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Permisos del espacio</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{modules.map(([module, label]) => <label key={module} className="rounded-xl border border-white/[0.07] bg-black/10 p-3 text-xs font-semibold text-slate-300">{label}<select value={space.permissions?.[module] ?? "NONE"} onChange={(event) => void updatePermission(space, module, event.target.value as Permission)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#081525] px-2 py-2 text-xs text-white"><option value="NONE">{permissionLabels.NONE}</option><option value="SUMMARY_READ">{permissionLabels.SUMMARY_READ}</option><option value="DETAIL_READ">{permissionLabels.DETAIL_READ}</option><option value="EDIT">{permissionLabels.EDIT}</option><option value="ADMIN">{permissionLabels.ADMIN}</option></select></label>)}</div><p className="mt-3 text-xs leading-5 text-slate-600">Estos permisos definen qué puede compartirse dentro de este espacio cuando cada módulo integre su colaboración.</p></div></div></article>)}</section>}</div></main>;
}
