import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

function owner(params: { ownerEmail?: string | string[] }) {
  const value = Array.isArray(params.ownerEmail) ? params.ownerEmail[0] : params.ownerEmail;
  return value ? decodeURIComponent(value) : "";
}

export const GET = serverAuth(async (req, ctx) => {
  try {
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const email = owner(await ctx.params);
    const res = await fetch(`${process.env.API_GATEWAY_URL ?? "http://localhost:8080"}/tag/tags/shared/${encodeURIComponent(email)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error cargando las etiquetas compartidas");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});

export const POST = serverAuth(async (req, ctx) => {
  try {
    const failure = sameOriginFailure(req);
    if (failure) return failure;
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const email = owner(await ctx.params);
    const res = await fetch(`${process.env.API_GATEWAY_URL ?? "http://localhost:8080"}/tag/tags/shared/${encodeURIComponent(email)}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(await req.json()), cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error creando la etiqueta compartida");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});
