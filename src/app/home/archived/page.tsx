"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Item = {
  id: number;
  ownerEmail: string;
  shared: boolean;
  name: string;
  description: string;
  brand: string;
  model: string;
  status: string;
  price?: number | null;
  currency: string;
  warrantyEndDate: string;
  archived: boolean;
  attachments: Array<{ contentType: string }>;
};

const statusLabels: Record<string, string> = { ACTIVE: "Activo", SOLD: "Vendido", DONATED: "Donado", LOST: "Perdido", RETIRED: "Retirado" };
const input = "rounded-2xl border border-white/10 bg-[#081525]/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/10";

function message(json: unknown, fallback: string) {
  const value = json as { error?: { message?: string } } | null;
  return value?.error?.message ?? fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export default function ArchivedHomeItemsPage() {
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope") === "shared" ? "shared" : "personal";
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/home/items/archived?scope=${scope}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(message(json, "No se pudieron cargar los archivados"));
      setItems(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los archivados");
    } finally {
      setLoading(false);
    }
  }

  // La carga depende del ámbito seleccionado y actualiza el estado al terminar la petición.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [scope]);

  async function restore(id: number) {
    const res = await fetch(`/api/home/items/${id}/restore`, { method: "PATCH" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) { setError(message(json, "No se pudo restaurar el artículo")); return; }
    void load();
  }

  async function deletePermanently(item: Item) {
    const confirmed = window.confirm(`Vas a eliminar definitivamente «${item.name}». Se borrarán también su ticket, garantía y fotos. Esta acción no se puede deshacer. ¿Continuar?`);
    if (!confirmed) return;
    const res = await fetch(`/api/home/items/${item.id}/permanent`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) { setError(message(json, "No se pudo eliminar definitivamente el artículo")); return; }
    void load();
  }

  return <main className="min-h-[calc(100vh-4.5rem)] bg-[#050b14] px-4 py-8 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">
    <Link href={`/home?scope=${scope}`} className="text-sm font-semibold text-cyan-200 hover:text-white">← Volver al inventario</Link>
    <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200/70">LifeHub / Hogar</p><h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Artículos archivados</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Aquí se conservan los artículos que has retirado del inventario activo. Puedes restaurarlos o eliminarlos definitivamente.</p></div><span className="w-fit rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-200">{items.length} {items.length === 1 ? "artículo" : "artículos"}</span></div>
    {error ? <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-200">{error}</div> : null}
    {loading ? <div className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-12 text-center text-sm text-slate-400">Cargando archivados…</div> : items.length === 0 ? <div className="mt-8 rounded-[2rem] border border-dashed border-white/[0.14] bg-white/[0.025] p-12 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-amber-300/10 text-3xl text-amber-200">⌁</div><h2 className="mt-5 text-xl font-bold">No hay artículos archivados</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Cuando archives un artículo, aparecerá aquí sin perder sus datos.</p><Link href="/home" className={`${input} mt-6 inline-flex font-bold text-cyan-200 hover:bg-white/[0.06]`}>Volver al inventario</Link></div> : <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.id} className="rounded-[1.75rem] border border-amber-300/15 bg-white/[0.035] p-5"><div className="flex items-start justify-between gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300/10 text-xl text-amber-200">{item.attachments[0]?.contentType.startsWith("image/") ? "▧" : "▤"}</div><span className="rounded-full border border-slate-300/15 bg-slate-300/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-300">Archivado</span></div><Link href={`/home/items/${item.id}`} className="mt-5 block"><h2 className="text-lg font-black hover:text-cyan-100">{item.name}</h2><p className="mt-1 text-sm text-slate-400">{item.brand} · {item.model}</p></Link><p className="mt-4 line-clamp-2 text-sm text-slate-500">{item.description}</p><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div><p className="text-slate-600">Estado anterior</p><p className="mt-1 font-semibold text-slate-300">{statusLabels[item.status] ?? item.status}</p></div><div><p className="text-slate-600">Garantía hasta</p><p className="mt-1 font-semibold text-slate-300">{formatDate(item.warrantyEndDate)}</p></div></div><div className="mt-5 flex flex-wrap justify-end gap-2"><Link href={`/home/items/${item.id}`} className="rounded-xl px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-300/10">Ver detalle</Link><button type="button" onClick={() => void restore(item.id)} className="rounded-xl border border-emerald-300/20 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-300/10">Restaurar</button><button type="button" onClick={() => void deletePermanently(item)} className="rounded-xl border border-rose-300/20 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-300/10">Eliminar definitivamente</button></div></article>)}</div>}
  </div></main>;
}
