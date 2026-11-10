import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

export const POST = serverAuth(async (req, ctx) => {
  try {
    const failure = sameOriginFailure(req);
    if (failure) return failure;
    const token = req.auth?.accessToken;
    const body = await req.json().catch(() => null);
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const { id } = await ctx.params;
    const res = await fetch(`${process.env.API_GATEWAY_URL ?? "http://localhost:8080"}/connections/spaces/${id}/members`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error añadiendo al espacio");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});

export const DELETE = serverAuth(async (req, ctx) => {
  try {
    const failure = sameOriginFailure(req);
    if (failure) return failure;
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const { id } = await ctx.params;
    const email = new URL(req.url).searchParams.get("email");
    if (!email) return NextResponse.json({ ok: false, error: { message: "Email obligatorio" } }, { status: 400 });
    const res = await fetch(`${process.env.API_GATEWAY_URL ?? "http://localhost:8080"}/connections/spaces/${id}/members/${encodeURIComponent(email)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error quitando al miembro");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});
