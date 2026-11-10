import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

const base = () => process.env.API_GATEWAY_URL ?? "http://localhost:8080";

export const GET = serverAuth(async (req) => {
  try {
    const token = req.auth?.accessToken; if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const query = new URL(req.url).search;
    const res = await fetch(`${base()}/home/items${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error cargando inventario");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (e) { return NextResponse.json({ ok: false, error: { message: getErrorMessage(e, "Error interno") } }, { status: 500 }); }
});

export const POST = serverAuth(async (req) => {
  try {
    const failure = sameOriginFailure(req); if (failure) return failure;
    const token = req.auth?.accessToken; if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const incoming = await req.formData();
    const itemPart = incoming.get("item");
    const item = typeof itemPart === "string"
      ? itemPart
      : itemPart instanceof File
        ? await itemPart.text()
        : null;
    if (!item?.trim()) return NextResponse.json({ ok: false, error: { message: "Faltan los datos del artículo. Completa el formulario e inténtalo de nuevo." } }, { status: 400 });
    try {
      JSON.parse(item);
    } catch {
      return NextResponse.json({ ok: false, error: { message: "Los datos del artículo no tienen un formato válido. Recarga el formulario e inténtalo de nuevo." } }, { status: 400 });
    }
    const outgoing = new FormData();
    outgoing.append("item", new Blob([item], { type: "application/json" }), "item.json");
    for (const file of incoming.getAll("files")) if (file instanceof File && file.size > 0) outgoing.append("files", file, file.name);
    for (const type of incoming.getAll("fileTypes")) if (typeof type === "string") outgoing.append("fileTypes", type);
    const res = await fetch(`${base()}/home/items`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: outgoing, cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error guardando artículo");
    return NextResponse.json({ ok: true, data: await res.json() }, { status: 201 });
  } catch (e) { return NextResponse.json({ ok: false, error: { message: getErrorMessage(e, "Error interno") } }, { status: 500 }); }
});
