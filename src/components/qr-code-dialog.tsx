"use client";

import { useState, useRef, useEffect } from "react";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, FileDown, ImageDown, Link as LinkIcon, Copy } from "lucide-react";

interface QrCodeItem {
  type: 'leito' | 'area';
  displayName: string;
  code: string;
  shortCode: string;
}

interface QrCodeDialogProps {
  item: QrCodeItem;
  children: React.ReactNode;
}

export function QrCodeDialog({ item, children }: QrCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [fullUrl, setFullUrl] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setFullUrl(`${window.location.origin}/clean/${item.code}`);
    }
  }, [open, item.code]);

  const downloadAs = async (format: "svg" | "png") => {
    if (!qrRef.current) return;

    const svgElement = qrRef.current.querySelector("svg");
    if (!svgElement) {
      toast({
        title: "Erro",
        description: "Não foi possível encontrar o elemento SVG do QR Code.",
        variant: "destructive",
      });
      return;
    }

    const svgString = new XMLSerializer().serializeToString(svgElement);

    if (format === "svg") {
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.shortCode}_qrcode.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }

    if (format === "png") {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width * 4;
        canvas.height = img.height * 4;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `${item.shortCode}_qrcode.png`;
        a.click();
      };
      
      img.src = `data:image/svg+xml;base64,${btoa(svgString)}`;
    }
  };
  
  const handleTestLink = () => {
    console.log('🧪 [DEBUG] Testando link:', fullUrl);
    if (fullUrl) {
      window.open(fullUrl, '_blank');
    }
  };

  const handleCopyLink = () => {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl).then(() => {
        console.log('📋 [DEBUG COPIA] Link copiado:', fullUrl);
        toast({
            title: "Link Copiado!",
            description: "A URL de higienização foi copiada.",
        });
    }).catch(err => {
        console.error('Falha ao copiar:', err);
        toast({
            title: "Erro ao Copiar",
            description: "Não foi possível copiar o link.",
            variant: "destructive",
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR Code para: {item.displayName}</DialogTitle>
          <DialogDescription>
            Código: {item.shortCode}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg">
          {fullUrl && (
            <div ref={qrRef}>
                <QRCode
                    value={fullUrl}
                    size={256}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    level="Q"
                />
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            Escaneie para iniciar a higienização.
          </p>
           <p className="text-xs text-muted-foreground mt-2 text-center">
             Use "Testar Link" para simular o escaneamento ou copie o link para testes.
           </p>
        </div>
        <DialogFooter className="gap-2 sm:justify-between flex-wrap">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTestLink} disabled={!fullUrl}>
              <LinkIcon className="mr-2 h-4 w-4" />
              Testar Link
            </Button>
            <Button variant="outline" onClick={handleCopyLink} disabled={!fullUrl}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar Link
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadAs("svg")}>
              <FileDown className="mr-2" />
              Baixar SVG
            </Button>
            <Button onClick={() => downloadAs("png")}>
              <ImageDown className="mr-2" />
              Baixar PNG
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
