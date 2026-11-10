import { NextResponse } from "next/server";
import { serverAuth } from "@/app/lib/auth";
import { backendErrorResponse, getErrorMessage, sameOriginFailure } from "@/app/lib/api/errors";

export const DELETE = serverAuth(async (req, ctx) => {
  try {
    const failure = sameOriginFailure(req);
    if (failure) return failure;
    const token = req.auth?.accessToken;
    if (!token) return NextResponse.json({ ok: false, error: { message: "No autenticado" } }, { status: 401 });
    const params = await ctx.params;
    const ownerEmail = Array.isArray(params.ownerEmail) ? params.ownerEmail[0] : params.ownerEmail;
    const tagId = Array.isArray(params.tagId) ? params.tagId[0] : params.tagId;
    const res = await fetch(`${process.env.API_GATEWAY_URL ?? "http://localhost:8080"}/tag/tags/shared/${encodeURIComponent(decodeURIComponent(ownerEmail))}/${encodeURIComponent(tagId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return backendErrorResponse(res, "Error eliminando la etiqueta compartida");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: getErrorMessage(error, "Error interno") } }, { status: 500 });
  }
});
