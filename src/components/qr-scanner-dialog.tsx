
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
            Aponte a câmera para o QR Code do local.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center items-center py-4">
          <div className="relative w-[250px] h-[250px] overflow-hidden rounded-xl bg-black border-2 border-primary/50 shadow-inner">
            <div id="qr-reader" className="w-full h-full"></div>
            
            {/* Moldura Visual (Overlay) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/40 rounded-lg border-dashed"></div>
                <div className="absolute inset-0 border-[20px] border-black/20"></div>
            </div>

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-background/90 z-20">
                <p className="text-xs text-destructive font-medium mb-4">{error}</p>
                <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 h-3 w-3" /> Recarregar
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
