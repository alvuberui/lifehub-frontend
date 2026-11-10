// src/app/page.tsx
import { serverAuth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import ClientHome from "./ClientHome";

export default async function Page() {
  const session = await serverAuth();

  // La raíz es la puerta de entrada de LifeHub. El estado de onboarding
  // pertenece al módulo FinanzApp y se comprueba al abrir dicho módulo.
  if (!session?.user?.email || session.tokenError || !session.accessToken) {
    return <ClientHome />;
  }

  redirect("/dashboard");
}
