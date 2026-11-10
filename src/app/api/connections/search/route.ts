import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage } from "@/app/lib/api/errors";

export const GET = serverAuth(async (req) => {
  try {
    const token = req.auth?.accessToken;
    const query = new URL(req.url).searchParams.get("query")?.trim() ?? "";
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    if (query.length < 2) return NextResponse.json({ ok: true, data: [] });
    const base = process.env.API_GATEWAY_URL ?? "http://localhost:8080";
    const res = await fetch(`${base}/connections/search?query=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error buscando usuarios");
    return NextResponse.json({ ok: true, data: await res.json() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});
