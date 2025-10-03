export const mockExternalData = [
  { code1: "QTO101", tipobloq: "L" },
  { code1: "QTO102", tipobloq: "*" },
  { code1: "QTO103", tipobloq: "L" },
  { code1: "APTO201", tipobloq: "*" },
  { code1: "APTO202", tipobloq: "L" },
];

// Função alternativa para desenvolvimento
export async function runMockSync() {
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Simular sucesso
  return {
    success: true,
    message: "Sincronização mock concluída! 5 leitos processados.",
    stats: { updated: 3, total: 5, invalid: 0 }
  };
}
