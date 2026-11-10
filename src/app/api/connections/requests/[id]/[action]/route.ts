import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

export const POST = serverAuth(async (req, ctx) => {
  try {
    const failure = sameOriginFailure(req);
    if (failure) return failure;
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const { id, action } = await ctx.params;
    if (!["accept", "reject", "cancel"].includes(action)) return NextResponse.json({ ok: false, error: { message: "Acción no válida" } }, { status: 400 });
    const base = process.env.API_GATEWAY_URL ?? "http://localhost:8080";
    const res = await fetch(`${base}/connections/requests/${encodeURIComponent(id)}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error actualizando la solicitud");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});
