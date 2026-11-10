import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

export const PATCH = serverAuth(async (req, ctx) => {
  try {
    const failure = sameOriginFailure(req);
    if (failure) return failure;
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const body = await req.json().catch(() => null) as { shared?: unknown } | null;
    if (typeof body?.shared !== "boolean") return NextResponse.json({ ok: false, error: { message: "shared debe ser booleano" } }, { status: 400 });
    const { id } = await ctx.params;
    const base = process.env.API_GATEWAY_URL ?? "http://localhost:8080";
    const response = await fetch(`${base}/home/items/${id}/sharing?shared=${body.shared}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!response.ok) return backendErrorResponse(response, "No se pudo actualizar la visibilidad del artículo");
    return NextResponse.json({ ok: true, data: await response.json() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(e, "Error interno") } }, { status: 500 });
  }
});
