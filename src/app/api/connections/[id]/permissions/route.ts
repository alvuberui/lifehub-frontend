import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

export const PUT = serverAuth(async (req, ctx) => {
  try {
    const failure = sameOriginFailure(req);
    if (failure) return failure;
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body.module !== "string" || typeof body.permission !== "string") return NextResponse.json({ ok: false, error: { message: "Permiso inválido" } }, { status: 400 });
    const base = process.env.API_GATEWAY_URL ?? "http://localhost:8080";
    const res = await fetch(`${base}/connections/${encodeURIComponent(id)}/permissions`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error actualizando el permiso");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});
