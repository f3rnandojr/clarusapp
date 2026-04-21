// eslint-disable-next-line @typescript-eslint/no-require-imports
const jsPDF = require("jspdf").jsPDF;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const autoTable = require("jspdf-autotable").default;
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Paleta ──────────────────────────────────────────────────────────────────
const BRAND_DARK  = [15,  76,  92];  // #0F4C5C
const BRAND_LINE  = [21, 101, 192];  // #1565C0 — azul NAVI
const ROW_ALT     = [245, 249, 250];
const GRAY_BORDER = [210, 220, 225];

function formatDate(dateStr?: string, withTime = true) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (!isValid(d)) return "—";
  return withTime
    ? format(d, "dd/MM/yyyy HH:mm", { locale: ptBR })
    : format(d, "dd/MM/yyyy",       { locale: ptBR });
}

function minutesToHm(min: number) {
  if (!min) return "0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch("/logo_64x64.png");
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addHeaderAndFooter(
  doc: any,
  title: string,
  subtitle: string,
  logoB64: string | null,
  generatedAt: string
) {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    // ── Cabeçalho ──
    if (logoB64) {
      doc.addImage(logoB64, "PNG", 14, 11, 7, 7);
    }
    doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(...BRAND_LINE);
    doc.text("navi", logoB64 ? 23 : 14, 16);

    doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(...BRAND_DARK);
    doc.text(title, pw / 2, 17, { align: "center" });

    // Linha divisória fina e discreta
    doc.setDrawColor(...GRAY_BORDER);
    doc.setLineWidth(0.3);
    doc.line(14, 23, pw - 14, 23);

    // Subtítulo
    doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(100, 120, 130);
    doc.text(subtitle, 14, 29);
    doc.text(`Gerado em: ${generatedAt}`, pw - 14, 29, { align: "right" });

    // ── Rodapé ──
    doc.setDrawColor(...GRAY_BORDER);
    doc.setLineWidth(0.3);
    doc.line(14, ph - 12, pw - 14, ph - 12);
    doc.setFontSize(7).setFont("helvetica", "normal").setTextColor(120, 140, 150);
    doc.text("navi — Gestão de Higienização Hospitalar", 14, ph - 7);
    doc.text(`Pág. ${i} / ${pageCount}  |  ${generatedAt}`, pw - 14, ph - 7, { align: "right" });
  }
}

// ── Exportadores por escopo ───────────────────────────────────────────────────

export async function exportGeneralReport(report: any, periodLabel: string) {
  const doc: any = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logoB64 = await loadLogoBase64();
  const now = format(new Date(), "dd/MM/yyyy HH:mm");

  const summaryRows = [
    ["Total de Higienizações", String(report.total || 0)],
    ["Concorrente",           `${report.concurrent || 0}  (média ${report.avgConcurrentTime || 0} min)`],
    ["Terminal",              `${report.terminal || 0}  (média ${report.avgTerminalTime || 0} min)`],
    ["Não Conformidades",     String(report.totalNCs || 0)],
    ["No Prazo",              `${(report.onTimePercent || 0).toFixed(1)} %`],
    ["Atrasados",             `${(report.delayedPercent || 0).toFixed(1)} %`],
    ["Auditorias — APTO",    String(report.totalAuditAptos || 0)],
    ["Auditorias — NÃO APTO",String(report.totalAuditNaoApto || 0)],
  ];

  autoTable(doc, {
    startY: 35,
    head: [["Indicador", "Valor"]],
    body: summaryRows,
    styles:        { fontSize: 9, cellPadding: 3 },
    headStyles:    { fillColor: BRAND_DARK, textColor: [255,255,255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles:  { 1: { fontStyle: "bold", halign: "right" } },
    margin:        { left: 14, right: 14 },
  });

  addHeaderAndFooter(doc, "Relatório Consolidado", `Período: ${periodLabel}`, logoB64, now);
  doc.save(`NAVI_Consolidado_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
}

export async function exportTableReport(
  report: any,
  columns: { header: string; key: string; format?: (v: any, row: any) => string }[],
  title: string,
  periodLabel: string
) {
  const doc: any = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logoB64 = await loadLogoBase64();
  const now = format(new Date(), "dd/MM/yyyy HH:mm");

  const rows = (report.details || []).map((item: any) =>
    columns.map(c => (c.format ? c.format(item[c.key], item) : (item[c.key] ?? "—")))
  );

  autoTable(doc, {
    startY: 35,
    head:  [columns.map(c => c.header)],
    body:  rows,
    styles:        { fontSize: 8, cellPadding: 2.5, overflow: "ellipsize" },
    headStyles:    { fillColor: BRAND_DARK, textColor: [255,255,255], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: ROW_ALT },
    margin:        { left: 14, right: 14 },
  });

  addHeaderAndFooter(doc, title, `Período: ${periodLabel}  |  Total: ${report.total || 0} registros`, logoB64, now);
  doc.save(`NAVI_${title.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
}

// ── Helpers de colunas por escopo ─────────────────────────────────────────────

export const delaysColumns = [
  { header: "Data",        key: "date",             format: (v: any) => formatDate(v) },
  { header: "Local",       key: "locationName",     format: (v: any) => v || "—" },
  { header: "Colaborador", key: "userName",         format: (v: any) => v || "—" },
  { header: "Tipo",        key: "cleaningType",     format: (v: any) => v === "terminal" ? "Terminal" : "Concorrente" },
  { header: "Duração Real", key: "actualDuration",  format: (v: any) => minutesToHm(v) },
  { header: "Esperado",    key: "expectedDuration", format: (v: any) => minutesToHm(v) },
  { header: "Excesso",     key: "actualDuration",   format: (_v: any, row: any) => minutesToHm((row.actualDuration||0) - (row.expectedDuration||0)) },
];

export const ncColumns = [
  { header: "Data",        key: "timestamp",    format: (v: any) => formatDate(v) },
  { header: "Local",       key: "locationName", format: (v: any) => v || "—" },
  { header: "Usuário",     key: "userName",     format: (v: any) => v || "—" },
  { header: "Descrição",   key: "description",  format: (v: any) => v ? String(v).slice(0, 80) : "—" },
];

export const auditColumns = [
  { header: "Data",     key: "timestamp",    format: (v: any) => formatDate(v) },
  { header: "Leito",    key: "locationName", format: (v: any) => v || "—" },
  { header: "Setor",    key: "setor",        format: (v: any) => v || "—" },
  { header: "Auditor",  key: "auditorName",  format: (v: any) => v || "—" },
  { header: "Status",   key: "aptidao",      format: (v: any) => v === "apto" ? "APTO" : "NÃO APTO" },
  { header: "Obs.",     key: "observations", format: (v: any) => v ? String(v).slice(0, 60) : "—" },
];

export const historyColumns = [
  { header: "Início",       key: "startTime",        format: (v: any) => formatDate(v) },
  { header: "Fim",          key: "finishTime",       format: (v: any) => formatDate(v) },
  { header: "Leito",        key: "locationName",     format: (v: any) => v || "—" },
  { header: "Tipo",         key: "cleaningType",     format: (v: any) => v === "terminal" ? "Terminal" : "Concorrente" },
  { header: "Colaborador",  key: "userName",         format: (v: any) => v || "—" },
  { header: "Duração",      key: "actualDuration",   format: (v: any) => minutesToHm(v) },
  { header: "Atraso",       key: "delayed",          format: (v: any) => v ? "Sim" : "Não" },
];
