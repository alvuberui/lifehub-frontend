import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

const backendUrl = (path = "") => `${process.env.API_GATEWAY_URL ?? "http://localhost:8080"}/connections${path}`;

export const GET = serverAuth(async (req) => {
  try {
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const res = await fetch(backendUrl(), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error cargando tus conexiones");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});

export const POST = serverAuth(async (req) => {
  try {
    const failure = sameOriginFailure(req);
    if (failure) return failure;
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body.recipientEmail !== "string" || !body.recipientEmail.trim()) {
      return NextResponse.json({ ok: false, error: { message: "Indica el email del usuario." } }, { status: 400 });
    }
    const res = await fetch(backendUrl("/requests"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipientEmail: body.recipientEmail.trim() }),
      cache: "no-store",
    });
    if (!res.ok) return backendErrorResponse(res, "Error enviando la solicitud");
    return NextResponse.json({ ok: true, data: await res.json() }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});
