import { ExternalLeito } from './external-db-connection';
import { IntegrationConfig } from './schemas';

export interface TransformationResult {
  success: boolean;
  data: any[];
  stats: {
    total: number;
    transformed: number;
    skipped: number;
    errors: number;
  };
  errors: Array<{
    originalData: any;
    error: string;
  }>;
}

export interface FieldMapping {
  source: string;
  target: string;
  transform?: (value: any) => any;
}

export class DataTransformer {
  private config: IntegrationConfig;
  
  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  // Transformação principal
  public transform(externalData: ExternalLeito[]): TransformationResult {
    const result: TransformationResult = {
      success: true,
      data: [],
      stats: {
        total: externalData.length,
        transformed: 0,
        skipped: 0,
        errors: 0
      },
      errors: []
    };

    for (const item of externalData) {
      try {
        const transformed = this.transformItem(item);
        
        if (transformed) {
          result.data.push(transformed);
          result.stats.transformed++;
        } else {
          result.stats.skipped++;
        }
      } catch (error) {
        result.stats.errors++;
        result.errors.push({
          originalData: item,
          error: (error as Error).message
        });
        console.error('Erro na transformação:', error, item);
      }
    }

    result.success = result.stats.errors === 0;
    return result;
  }

  private transformItem(item: ExternalLeito): any {
    // Validar dados obrigatórios
    if (!item[this.config.fieldMappings.codeField]) {
      throw new Error(`Campo código (${this.config.fieldMappings.codeField}) não encontrado`);
    }

    if (!item[this.config.fieldMappings.statusField]) {
      throw new Error(`Campo status (${this.config.fieldMappings.statusField}) não encontrado`);
    }

    // Mapear status
    const status = this.mapStatus(item[this.config.fieldMappings.statusField]);
    
    // Extrair nome e número
    const { name, number } = this.extractNameAndNumber(item);
    
    // Validar dados transformados
    if (!name || !number || !status) {
      throw new Error('Dados transformados inválidos');
    }

    return {
      name,
      number,
      status,
      externalCode: item[this.config.fieldMappings.codeField],
      externalStatus: item[this.config.fieldMappings.statusField],
      lastExternalUpdate: new Date()
    };
  }

  private mapStatus(externalStatus: string): 'available' | 'occupied' | 'in_cleaning' | null {
    const { statusMappings } = this.config;
    
    if (externalStatus === statusMappings.available) {
      return 'available';
    } else if (externalStatus === statusMappings.occupied) {
      return 'occupied';
    } else if (statusMappings.in_cleaning && externalStatus === statusMappings.in_cleaning) {
      return 'in_cleaning';
    }
    
    console.warn(`Status não mapeado: "${externalStatus}"`);
    return null;
  }

  private extractNameAndNumber(item: ExternalLeito): { name: string; number: string } {
    const codeValue = item[this.config.fieldMappings.codeField];
    
    // Se houver campos específicos para nome e número, usar eles
    if (this.config.fieldMappings.nameField && this.config.fieldMappings.numberField) {
      return {
        name: item[this.config.fieldMappings.nameField] || 'Leito',
        number: item[this.config.fieldMappings.numberField] || codeValue
      };
    }
    
    // Usar transformação padrão baseada em padrões
    return this.transformCodeValue(codeValue);
  }

  private transformCodeValue(codeValue: string): { name: string; number: string } {
    const { transformation } = this.config;
    
    // Tentar usar padrões regex personalizados
    if (transformation.namePattern && transformation.numberPattern) {
      try {
        const nameMatch = codeValue.match(new RegExp(transformation.namePattern));
        const numberMatch = codeValue.match(new RegExp(transformation.numberPattern));
        
        if (nameMatch && numberMatch) {
          return {
            name: nameMatch[1] || 'Leito',
            number: numberMatch[1] || codeValue
          };
        }
      } catch (error) {
        console.warn('Erro ao aplicar padrões regex personalizados:', error);
      }
    }
    
    // Fallback para lógica padrão
    return this.defaultCodeTransformation(codeValue);
  }

  private defaultCodeTransformation(codeValue: string): { name: string; number: string } {
    // Lógica inteligente para diferentes formatos
    
    // Formato: "QTO101", "APTO202", "LEITO305"
    const format1 = codeValue.match(/^([A-Za-z]+)([0-9]+)$/);
    if (format1) {
      return {
        name: this.mapCommonNames(format1[1]),
        number: format1[2]
      };
    }
    
    // Formato: "QUARTO-101", "APTO-202"
    const format2 = codeValue.match(/^([A-Za-z]+)-([0-9]+)$/);
    if (format2) {
      return {
        name: this.mapCommonNames(format2[1]),
        number: format2[2]
      };
    }
    
    // Formato: "101-QTO", "202-APTO"
    const format3 = codeValue.match(/^([0-9]+)-([A-Za-z]+)$/);
    if (format3) {
      return {
        name: this.mapCommonNames(format3[2]),
        number: format3[1]
      };
    }
    
    // Fallback: separar por onde encontrar números
    const name = codeValue.replace(/[0-9]/g, '').trim() || 'Leito';
    const number = codeValue.replace(/[^0-9]/g, '').trim() || codeValue;
    
    return { name, number };
  }

  private mapCommonNames(abbreviation: string): string {
    const nameMap: { [key: string]: string } = {
      'QTO': 'Quarto',
      'APTO': 'Apartamento', 
      'LEITO': 'Leito',
      'QUARTO': 'Quarto',
      'APT': 'Apartamento',
      'SL': 'Sala',
      'SALA': 'Sala',
      'CX': 'Caixa',
      'BOX': 'Box'
    };
    
    return nameMap[abbreviation.toUpperCase()] || abbreviation;
  }
}

// Funções utilitárias
export function validateTransformationConfig(config: IntegrationConfig): string[] {
  const errors: string[] = [];
  
  if (!config.fieldMappings.codeField) {
    errors.push('Campo de código não configurado');
  }
  
  if (!config.fieldMappings.statusField) {
    errors.push('Campo de status não configurado');
  }
  
  if (!config.statusMappings.available) {
    errors.push('Mapeamento para status "Disponível" não configurado');
  }
  
  if (!config.statusMappings.occupied) {
    errors.push('Mapeamento para status "Ocupado" não configurado');
  }
  
  return errors;
}

export function generateSampleTransformation(config: IntegrationConfig) {
  const sampleData = [
    { [config.fieldMappings.codeField]: "QTO101", [config.fieldMappings.statusField]: config.statusMappings.available },
    { [config.fieldMappings.codeField]: "APTO202", [config.fieldMappings.statusField]: config.statusMappings.occupied },
  ];
  
  const transformer = new DataTransformer(config);
  return transformer.transform(sampleData);
}
