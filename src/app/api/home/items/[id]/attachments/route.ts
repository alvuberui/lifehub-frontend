import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

export const POST = serverAuth(async (req, ctx) => {
  try {
    const failure = sameOriginFailure(req); if (failure) return failure;
    const token = req.auth?.accessToken; if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const { id } = await ctx.params;
    const incoming = await req.formData();
    const outgoing = new FormData(); const file = incoming.get("file");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, error: { message: "Selecciona un documento" } }, { status: 400 });
    outgoing.append("file", file, file.name);
    const type = incoming.get("type");
    const url = `${process.env.API_GATEWAY_URL ?? "http://localhost:8080"}/home/items/${id}/attachments${type ? `?type=${encodeURIComponent(String(type))}` : ""}`;
    const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: outgoing });
    if (!res.ok) return backendErrorResponse(res, "Error guardando documento");
    return NextResponse.json({ ok: true, data: await res.json() }, { status: 201 });
  } catch (e) { return NextResponse.json({ ok: false, error: { message: getErrorMessage(e, "Error interno") } }, { status: 500 }); }
});
