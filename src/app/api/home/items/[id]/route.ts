import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

const base = () => process.env.API_GATEWAY_URL ?? "http://localhost:8080";

export const GET = serverAuth(async (req, ctx) => {
  try {
    const token = req.auth?.accessToken; if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const { id } = await ctx.params;
    const res = await fetch(`${base()}/home/items/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error cargando artículo");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (e) { return NextResponse.json({ ok: false, error: { message: getErrorMessage(e, "Error interno") } }, { status: 500 }); }
});

export const PUT = serverAuth(async (req, ctx) => {
  try {
    const failure = sameOriginFailure(req); if (failure) return failure;
    const token = req.auth?.accessToken; if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const { id } = await ctx.params;
    const res = await fetch(`${base()}/home/items/${id}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(await req.json()), cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error actualizando artículo");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (e) { return NextResponse.json({ ok: false, error: { message: getErrorMessage(e, "Error interno") } }, { status: 500 }); }
});

export const DELETE = serverAuth(async (req, ctx) => {
  try {
    const failure = sameOriginFailure(req); if (failure) return failure;
    const token = req.auth?.accessToken; if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const { id } = await ctx.params;
    const res = await fetch(`${base()}/home/items/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return backendErrorResponse(res, "Error archivando artículo");
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ ok: false, error: { message: getErrorMessage(e, "Error interno") } }, { status: 500 }); }
});
