import { ExternalLeito } from './external-db-connection';
import { IntegrationConfig } from './schemas';

export interface TransformedLeito {
  name: string;
  number: string;
  status: 'available' | 'occupied';
  externalCode: string;
}

export function transformLeitoData(
  externalData: ExternalLeito[], 
  config: IntegrationConfig
): TransformedLeito[] {
    return externalData.map(item => {
        const codeFieldValue = item[config.fieldMappings.codeField as keyof ExternalLeito];
        const statusFieldValue = item[config.fieldMappings.statusField as keyof ExternalLeito];

        // Mapear status baseado nas configurações
        let status: 'available' | 'occupied' = 'occupied'; // default

        if (statusFieldValue === config.statusMappings.available) {
            status = 'available';
        } else if (statusFieldValue === config.statusMappings.occupied) {
            status = 'occupied';
        }
        
        // Transformar code1 em name e number
        const { name, number } = parseLocationCode(codeFieldValue, config.fieldMappings.nameSeparator);
        
        return {
        name,
        number,
        status,
        externalCode: codeFieldValue
        };
    }).filter(item => item !== null) as TransformedLeito[];
}

function parseLocationCode(code: string, separator: string): { name: string; number: string } {
    if (!code) return { name: '', number: '' };

    if (separator && separator.trim() !== '' && code.includes(separator)) {
        const parts = code.split(separator);
        const number = parts.pop() || '';
        const name = parts.join(' ');
        return { name, number };
    }
    
    // Lógica para extrair nome e número do code1
    // Exemplo: "QTO101" → name: "Quarto", number: "101"
    const match = code.match(/^([a-zA-Z\s]+)(\d+.*)$/);
    if (match) {
        return { name: match[1].trim(), number: match[2].trim() };
    }

    // Fallback se não houver separação clara
    const name = code.replace(/[0-9-]/g, '').trim() || 'Leito';
    const number = (code.match(/[\d-]+/) || [code])[0];

    return { name, number };
}

export function validateTransformedData(data: TransformedLeito[]): { valid: TransformedLeito[]; invalid: any[] } {
  const valid: TransformedLeito[] = [];
  const invalid: any[] = [];

  data.forEach(item => {
    if (item.name && item.number && item.status) {
      valid.push(item);
    } else {
      invalid.push(item);
    }
  });

  return { valid, invalid };
}
