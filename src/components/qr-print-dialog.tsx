"use client";

import { useState, useEffect, useRef } from "react";
import { getLocations } from "@/lib/actions";
import type { Location } from "@/lib/schemas";
import QRCode from "react-qr-code";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Filter = 'all' | 'leito' | 'area';

export function QrPrintDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen]           = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filter, setFilter]       = useState<Filter>('all');
  const [loading, setLoading]     = useState(false);
  const [origin, setOrigin]       = useState('');
  const printAreaRef              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setOrigin(window.location.origin);
    setLoading(true);
    getLocations().then(locs => {
      setLocations(locs || []);
      setLoading(false);
    });
  }, [open]);

  const filtered = locations.filter(loc =>
    filter === 'all' || loc.locationType === filter
  );

  const handlePrint = () => {
    const printArea = printAreaRef.current;
    if (!printArea || filtered.length === 0) return;

    // Capture SVG elements rendered by react-qr-code
    const svgEls = Array.from(printArea.querySelectorAll('svg'));
    const labelsHtml = filtered.map((loc, i) => {
      const svgStr = svgEls[i] ? new XMLSerializer().serializeToString(svgEls[i]) : '';
      return `
        <div class="label">
          <div class="qr">${svgStr}</div>
          <span class="name">${loc.externalCode || loc.name}</span>
          <div class="brand">
            <img src="${origin}/logo_32x32.png" width="14" height="14" alt="" />
            <span>NAVI</span>
          </div>
        </div>`;
    }).join('');

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;';
    document.body.appendChild(iframe);

    const iDoc = iframe.contentDocument!;
    iDoc.open();
    iDoc.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>NAVI — QR Codes</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; padding: 8mm; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .label {
      border: 1.5px dashed #bbb; border-radius: 12px; padding: 16px 12px 12px;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      page-break-inside: avoid; background: #fff;
    }
    .qr svg { display: block; width: 140px !important; height: 140px !important; }
    .name   { font-size: 15px; font-weight: 800; color: #0F4C5C; text-align: center; line-height: 1.3; }
    .brand  { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
    .brand img { border-radius: 2px; }
    .brand span { font-size: 9px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 0.1em; }
    @page { margin: 8mm; }
  </style>
</head>
<body>
  <div class="grid">${labelsHtml}</div>
  <script>window.onload=function(){window.print();}<\/script>
</body>
</html>`);
    iDoc.close();

    setTimeout(() => document.body.removeChild(iframe), 3000);
  };

  const filterLabels: Record<Filter, string> = { all: 'Todos', leito: 'Leitos', area: 'Áreas' };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-[#0F4C5C]">Impressão de QR Codes</DialogTitle>
          <DialogDescription>
            Gere etiquetas com QR Code para leitos e áreas. Borda pontilhada indica linha de corte.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-1.5">
            {(Object.keys(filterLabels) as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors",
                  filter === f
                    ? "bg-[#A0E9FF] text-[#0F4C5C]"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {filterLabels[f]}
              </button>
            ))}
            {!loading && (
              <span className="ml-2 text-xs text-gray-400 font-medium">
                {filtered.length} {filtered.length === 1 ? 'etiqueta' : 'etiquetas'}
              </span>
            )}
          </div>
          <Button
            onClick={handlePrint}
            disabled={loading || filtered.length === 0}
            className="h-9 bg-[#0F4C5C] hover:bg-[#0a3844] text-white font-black uppercase tracking-widest text-[10px] shrink-0"
          >
            <Printer className="mr-2 h-3.5 w-3.5" />
            Imprimir
          </Button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#A0E9FF]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-16 text-sm text-gray-400">Nenhum registro encontrado.</p>
          ) : (
            <div ref={printAreaRef} className="grid grid-cols-3 gap-3">
              {filtered.map(loc => (
                <div
                  key={loc._id.toString()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-3 flex flex-col items-center gap-2 bg-white"
                >
                  {origin && loc.externalCode && (
                    <QRCode
                      value={`${origin}/clean/${loc.externalCode}`}
                      size={140}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="Q"
                    />
                  )}
                  <span className="font-bold text-sm text-[#0F4C5C] text-center leading-tight">{loc.externalCode || loc.name}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo_32x32.png" alt="" width={12} height={12} style={{ borderRadius: 2 }} />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">NAVI</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
