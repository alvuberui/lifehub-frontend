import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

export const POST = serverAuth(async (req) => {
  try {
    const failure = sameOriginFailure(req);
    if (failure) return failure;
    const token = req.auth?.accessToken;
    const body = await req.json().catch(() => null);
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    if (!body || typeof body.email !== "string") return NextResponse.json({ ok: false, error: { message: "Usuario no válido" } }, { status: 400 });
    const base = process.env.API_GATEWAY_URL ?? "http://localhost:8080";
    const res = await fetch(`${base}/connections/blocks`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error bloqueando al usuario");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});
