"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { id: number; ownerEmail: string; shared: boolean; name: string; description: string; category?: { name: string } | null; brand: string; model: string; serialNumber?: string | null; location?: string | null; supplier: string; status: string; price?: number | null; currency: string; purchaseDate: string; warrantyEndDate: string; daysUntilWarranty: number; archived: boolean; attachments: Array<{ id: number; documentType: string; originalFilename: string; contentType: string; downloadUrl: string }> };
const labels: Record<string, string> = { ACTIVE: "Activo", SOLD: "Vendido", DONATED: "Donado", LOST: "Perdido", RETIRED: "Retirado" };
const documentTypeLabels: Record<string, string> = { RECEIPT: "Ticket o factura", WARRANTY: "Garantía", PHOTO: "Foto del artículo", OTHER: "Otro documento" };
function date(value: string) { return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }

export default function HomeItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/home/items/${id}`, { cache: "no-store" }).then(async (res) => {
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "No encontrado");
      setItem(json.data);
    }).catch((e) => setError(e instanceof Error ? e.message : "No encontrado"));
  }, [id]);

  async function restore() {
    const res = await fetch(`/api/home/items/${id}/restore`, { method: "PATCH" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) { setError(json?.error?.message ?? "No se pudo restaurar el artículo"); return; }
    setItem(json.data);
  }

  async function deletePermanently() {
    if (!item) return;
    if (!window.confirm(`Vas a eliminar definitivamente «${item.name}». Se borrarán también sus documentos y archivos. Esta acción no se puede deshacer. ¿Continuar?`)) return;
    const res = await fetch(`/api/home/items/${id}/permanent`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) { setError(json?.error?.message ?? "No se pudo eliminar definitivamente el artículo"); return; }
    router.push(item.archived ? "/home/archived" : "/home");
  }

  async function updateSharing() {
    if (!item) return;
    const nextShared = !item.shared;
    const res = await fetch(`/api/home/items/${id}/sharing`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shared: nextShared }) });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) { setError(json?.error?.message ?? "No se pudo actualizar la visibilidad"); return; }
    setItem(json.data);
  }

  if (error) return <main className="min-h-screen bg-[#050b14] p-8 text-rose-200">{error}</main>;
  if (!item) return <main className="min-h-screen bg-[#050b14] p-8 text-slate-400">Cargando artículo…</main>;
  const urgent = item.daysUntilWarranty <= 30;
  const fields: Array<[string, string | null | undefined]> = [
    ["Categoría", item.category?.name], ["Marca", item.brand], ["Modelo", item.model],
    ["Número de serie", item.serialNumber], ["Ubicación", item.location], ["Proveedor", item.supplier],
    ["Fecha de compra", date(item.purchaseDate)], ["Garantía hasta", date(item.warrantyEndDate)],
    ["Precio", item.price == null ? "Sin precio" : `${item.price.toFixed(2)} ${item.currency}`],
  ];
  return <main className="min-h-[calc(100vh-4.5rem)] bg-[#050b14] px-4 py-8 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl">
    <Link href="/home" className="text-sm font-semibold text-cyan-200 hover:text-white">← Volver al inventario</Link>
    <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/70">Detalle del artículo</p><h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">{item.name}</h1><p className="mt-2 text-slate-400">{item.brand} · {item.model}</p>{item.shared ? <p className="mt-2 text-xs font-semibold text-cyan-200/75">Hogar compartido · registrado por {item.ownerEmail}</p> : null}</div><div className="flex flex-wrap items-center gap-2"><span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${item.archived ? "border-amber-300/20 bg-amber-300/10 text-amber-200" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"}`}>{item.archived ? "Archivado" : labels[item.status] ?? item.status}</span>{item.shared ? <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-100">Compartido</span> : null}<button type="button" onClick={() => void updateSharing()} className="rounded-xl border border-cyan-300/20 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10">{item.shared ? "Hacer personal" : "Mover al hogar compartido"}</button>{item.archived ? <button type="button" onClick={() => void restore()} className="rounded-xl border border-emerald-300/20 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-300/10">Restaurar</button> : null}<button type="button" onClick={() => void deletePermanently()} className="rounded-xl border border-rose-300/20 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-300/10">Eliminar definitivamente</button></div></div>
    {urgent ? <div className="mt-7 rounded-3xl border border-amber-300/20 bg-amber-300/[0.07] p-5 text-sm text-amber-100"><b>Garantía {item.daysUntilWarranty < 0 ? "caducada" : "próxima a caducar"}.</b> Termina el {date(item.warrantyEndDate)}{item.daysUntilWarranty >= 0 ? `, en ${item.daysUntilWarranty} días` : ""}.</div> : null}
    <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]"><section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-6"><h2 className="text-lg font-black">Información</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{item.description}</p><dl className="mt-7 grid gap-5 border-t border-white/[0.08] pt-6 sm:grid-cols-2">{fields.map(([key, value]) => <div key={key}><dt className="text-xs font-bold uppercase tracking-wider text-slate-600">{key}</dt><dd className="mt-1 text-sm font-semibold text-slate-200">{value || "No indicado"}</dd></div>)}</dl></section>
      <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-6"><h2 className="text-lg font-black">Documentos guardados</h2><p className="mt-1 text-sm text-slate-500">Ticket, factura y garantía de este artículo.</p><div className="mt-5 space-y-3">{item.attachments.map((file) => <a key={file.id} href={`/api${file.downloadUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/10 p-3 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.06]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">{file.contentType.startsWith("image/") ? "▧" : "▤"}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-200">{file.originalFilename}</span><span className="block text-xs text-slate-500">{documentTypeLabels[file.documentType] ?? "Documento"}</span></span><span className="text-cyan-200">↗</span></a>)}{item.attachments.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Sin documentos</p> : null}</div></section></div>
  </div></main>;
}
