"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// This page now acts as a simple authenticator and redirector.
export default function CleanPage() {
  const router = useRouter();
  const params = useParams();
  const [status, setStatus] = useState("Validando acesso e redirecionando...");

  useEffect(() => {
    const processRedirect = () => {
      const code = Array.isArray(params.code) ? params.code[0] : params.code;

      if (!code) {
        setStatus("Código inválido.");
        router.push("/dashboard?error=invalid_code");
        return;
      }
      
      console.log(`[Clean Page] Código QR lido: ${code}. Redirecionando para o painel de controle.`);
      
      // The middleware handles session checking. If we are here, the user is logged in.
      // We redirect directly to the dashboard, passing the code.
      // The dashboard will handle fetching the location data and opening the dialog.
      router.push(`/dashboard?startCleaning=${code}`);
    };

    processRedirect();
  }, [params.code, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg">{status}</p>
      <p className="text-sm text-muted-foreground mt-2">Por favor, aguarde.</p>
    </div>
  );
}
