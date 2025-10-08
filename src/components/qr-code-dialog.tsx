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
import { Download, FileDown, ImageDown } from "lucide-react";

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
    if (open) {
      // A URL é sempre construída no lado do cliente
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
        canvas.width = img.width * 4; // Aumenta a resolução
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
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => downloadAs("svg")}>
            <FileDown className="mr-2" />
            Download SVG
          </Button>
          <Button onClick={() => downloadAs("png")}>
            <ImageDown className="mr-2" />
            Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
