"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession } from "@/lib/session"; 
import { Loader2 } from "lucide-react";

// This page acts as a router for QR code scans.
export default function CleanPage() {
  const router = useRouter();
  const params = useParams();
  const [status, setStatus] = useState("Validando...");

  useEffect(() => {
    const processCode = async () => {
      const code = Array.isArray(params.code) ? params.code[0] : params.code;

      if (!code) {
        setStatus("Código inválido.");
        router.push("/dashboard?error=invalid_code");
        return;
      }
      
      console.log(`[Clean Page] Processing code: ${code}`);

      // We can't call getSession() directly in a client component in this way.
      // The session check is handled by the middleware. If we are here,
      // we check if we need to redirect to login.
      const hasSessionCookie = document.cookie.includes("session=");

      if (hasSessionCookie) {
        // User is likely logged in. Redirect to dashboard with the code.
        // The dashboard will handle fetching data and opening the modal.
        console.log("[Clean Page] User is logged in. Redirecting to dashboard.");
        setStatus("Redirecionando para o painel...");
        router.push(`/dashboard?startCleaning=${code}`);

      } else {
        // User is not logged in. Save the code and redirect to login.
        console.log("[Clean Page] User not logged in. Saving code and redirecting to login.");
        setStatus("Redirecionando para o login...");
        sessionStorage.setItem("pendingCleaningLocation", code);
        router.push("/login");
      }
    };

    processCode();
  }, [params.code, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg">{status}</p>
      <p className="text-sm text-muted-foreground mt-2">Por favor, aguarde.</p>
    </div>
  );
}
