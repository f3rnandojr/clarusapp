
'use server';
/**
 * @fileOverview Fluxo Genkit para análise inteligente de Não Conformidades (NC).
 *
 * - analyzeNonConformity - Analisa a imagem e descrição de uma NC para sugerir categoria e prioridade.
 * - AnalyzeNCInput - Schema de entrada (descrição e foto base64).
 * - AnalyzeNCOutput - Schema de saída (categoria, prioridade e justificativa).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeNCInputSchema = z.object({
  description: z.string().describe('Descrição do problema relatado pelo colaborador.'),
  photoDataUri: z.string().optional().describe("Foto do problema em formato Data URI (base64)."),
});
export type AnalyzeNCInput = z.infer<typeof AnalyzeNCInputSchema>;

const AnalyzeNCOutputSchema = z.object({
  category: z.enum(['Manutenção', 'Limpeza', 'Infraestrutura', 'Segurança', 'Outros']).describe('Categoria do problema identificado.'),
  priority: z.enum(['Baixa', 'Média', 'Alta', 'Crítica']).describe('Nível de prioridade baseado na gravidade.'),
  reasoning: z.string().describe('Justificativa curta para a classificação sugerida.'),
});
export type AnalyzeNCOutput = z.infer<typeof AnalyzeNCOutputSchema>;

const ncPrompt = ai.definePrompt({
  name: 'analyzeNCPrompt',
  input: { schema: AnalyzeNCInputSchema },
  output: { schema: AnalyzeNCOutputSchema },
  prompt: `Você é um especialista em gestão hospitalar e segurança do paciente. 
Analise o relato de uma Não Conformidade (NC) encontrada em uma unidade hospitalar.

Se houver uma foto, use-a como evidência visual primária para avaliar o dano ou risco.
Considere os seguintes critérios para prioridade:
- Crítica: Risco imediato à vida ou impossibilidade total de uso do leito/sala.
- Alta: Risco de acidente, vazamentos ativos ou falha em equipamento essencial.
- Média: Problemas de estética ou funcionalidade que não impedem o uso imediato mas requerem atenção.
- Baixa: Pequenas avarias ou solicitações de rotina.

Relato: {{{description}}}
{{#if photoDataUri}}Foto: {{media url=photoDataUri}}{{/if}}`,
});

export async function analyzeNonConformity(input: AnalyzeNCInput): Promise<AnalyzeNCOutput> {
  const { output } = await ncPrompt(input);
  if (!output) {
      throw new Error('Falha ao analisar a Não Conformidade com IA.');
  }
  return output;
}

export const analyzeNCFlow = ai.defineFlow(
  {
    name: 'analyzeNCFlow',
    inputSchema: AnalyzeNCInputSchema,
    outputSchema: AnalyzeNCOutputSchema,
  },
  async (input) => {
    return analyzeNonConformity(input);
  }
);
