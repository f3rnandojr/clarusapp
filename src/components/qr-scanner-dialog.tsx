
'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Camera, RefreshCw } from 'lucide-react';

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
}

export function QrScannerDialog({ open, onOpenChange, onScanSuccess }: QrScannerDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!open) {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
      return;
    }

    // Pequeno delay para garantir que o DOM do modal foi montado
    const timer = setTimeout(() => {
      const container = document.getElementById('qr-reader');
      if (!container) return;

      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          html5QrCode.stop().then(() => {
            onScanSuccess(decodedText);
            onOpenChange(false);
          }).catch(console.error);
        },
        () => { /* frames falhando silenciosamente */ }
      ).catch(err => {
        console.error('Erro ao iniciar scanner:', err);
        setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [open, onOpenChange, onScanSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scanner de QR Code
          </DialogTitle>
          <DialogDescription>
            Aponte a câmera para o QR Code do local para iniciar a higienização.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted border flex items-center justify-center">
          <div id="qr-reader" className="w-full h-full"></div>
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-background/80">
              <p className="text-sm text-destructive font-medium mb-4">{error}</p>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Recarregar Página
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
