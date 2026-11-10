// src/app/Providers.tsx
"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

function SessionKickout() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const handledTokenError = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      if (pathname !== "/") router.replace("/");
      return;
    }

    const tokenError = session?.tokenError;
    if (status === "authenticated" && tokenError && !handledTokenError.current) {
      handledTokenError.current = true;
      (async () => {
        try {
          await signOut({ redirect: false });
        } catch {
          // El estado local se limpia igualmente al volver a la entrada.
        } finally {
          if (pathname !== "/") router.replace("/");
        }
      })();
    }
  }, [status, session?.tokenError, pathname, router]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionKickout />
      {children}
    </SessionProvider>
  );
}
