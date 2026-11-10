import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

function backendUrl(path: string) { return `${process.env.API_GATEWAY_URL ?? "http://localhost:8080"}${path}`; }

export const GET = serverAuth(async (req) => {
  try {
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const query = new URL(req.url).search;
    const res = await fetch(backendUrl(`/home/categories${query}`), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error cargando categorías");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (e) { return NextResponse.json({ ok: false, error: { message: getErrorMessage(e, "Error interno") } }, { status: 500 }); }
});

export const POST = serverAuth(async (req) => {
  try {
    const failure = sameOriginFailure(req); if (failure) return failure;
    const token = req.auth?.accessToken; if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const body = await req.json().catch(() => null);
    if (!body?.name?.trim()) return NextResponse.json({ ok: false, error: { message: "El nombre es obligatorio" } }, { status: 400 });
    const res = await fetch(backendUrl("/home/categories"), { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error creando categoría");
    return NextResponse.json({ ok: true, data: await res.json() }, { status: 201 });
  } catch (e) { return NextResponse.json({ ok: false, error: { message: getErrorMessage(e, "Error interno") } }, { status: 500 }); }
});
