
import { ExternalLeito } from './external-db-connection';
import { IntegrationConfig } from './schemas';
import { dbConnect } from './db';

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
  private db: any;
  
  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  private async connectDb() {
      if (!this.db) {
          this.db = await dbConnect();
      }
  }

  // Transformação principal
  public async transform(externalData: ExternalLeito[]): Promise<TransformationResult> {
    await this.connectDb();
    
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
        const transformed = await this.transformItem(item);
        
        if (transformed) {
          result.data.push(transformed);
          result.stats.transformed++;
        } else {
          result.stats.skipped++;
        }
      } catch (error: any) {
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

  private async transformItem(item: ExternalLeito): Promise<any> {
    const externalCode = item[this.config.fieldMappings.codeField];
    if (!externalCode) {
      throw new Error(`Campo código (${this.config.fieldMappings.codeField}) não encontrado`);
    }

    const externalStatus = item[this.config.fieldMappings.statusField];
    if (!externalStatus) {
      throw new Error(`Campo status (${this.config.fieldMappings.statusField}) não encontrado`);
    }

    const status = this.mapStatus(externalStatus);
    if (status === null) {
      return null; // Pula item com status não mapeado
    }
    
    const mapping = await this.db.collection('location_mappings').findOne({ externalCode });

    let name, number;

    if (mapping) {
        name = mapping.internalName;
        number = mapping.internalNumber;
    } else {
        const fallback = this.defaultCodeTransformation(externalCode);
        name = fallback.name;
        number = fallback.number;
    }
    
    if (!name || !number) {
      throw new Error('Dados transformados inválidos (nome ou número ausente)');
    }

    return {
      name,
      number,
      status,
      externalCode,
      externalStatus,
      lastExternalUpdate: new Date()
    };
  }

  private mapStatus(externalStatus: string): 'available' | 'occupied' | 'in_cleaning' | null {
    const { statusMappings } = this.config;
    
    const normalizedStatus = (externalStatus || '').trim();

    if (normalizedStatus === statusMappings.available) {
      return 'available';
    } else if (normalizedStatus === statusMappings.occupied) {
      return 'occupied';
    } else if (statusMappings.in_cleaning && normalizedStatus === statusMappings.in_cleaning) {
      return 'in_cleaning';
    }
    
    console.warn(`Status não mapeado: "${normalizedStatus}"`);
    return null;
  }
  
  private defaultCodeTransformation(codeValue: string): { name: string; number: string } {
    const formatComplexWithHyphen = codeValue.match(/^([A-Za-z]+)-([0-9]+[A-Za-z]?)$/);
    if (formatComplexWithHyphen) {
      return {
        name: this.mapCommonNames(formatComplexWithHyphen[1]),
        number: formatComplexWithHyphen[2]
      };
    }
    
    const formatComplexNoHyphen = codeValue.match(/^([A-Za-z]+)([0-9]+[A-Za-z]?)$/);
     if (formatComplexNoHyphen) {
      return {
        name: this.mapCommonNames(formatComplexNoHyphen[1]),
        number: formatComplexNoHyphen[2]
      };
    }

    const format1 = codeValue.match(/^([A-Za-z]+)([0-9]+)$/);
    if (format1) {
      return {
        name: this.mapCommonNames(format1[1]),
        number: format1[2]
      };
    }
    
    const format2 = codeValue.match(/^([A-Za-z]+)-([0-9]+)$/);
    if (format2) {
      return {
        name: this.mapCommonNames(format2[1]),
        number: format2[2]
      };
    }
    
    const format3 = codeValue.match(/^([0-9]+)-([A-Za-z]+)$/);
    if (format3) {
      return {
        name: this.mapCommonNames(format3[2]),
        number: format3[1]
      };
    }
    
    const name = codeValue.replace(/[0-9]/g, '').trim() || 'Leito';
    const number = codeValue.replace(/[^0-9]/g, '').trim() || codeValue;
    
    return { name, number };
  }

  private mapCommonNames(abbreviation: string): string {
    const nameMap: { [key: string]: string } = {
      'QTO': 'Quarto', 'APTO': 'Apartamento', 'LEITO': 'Leito',
      'QUARTO': 'Quarto', 'APT': 'Apartamento', 'SL': 'Sala',
      'SALA': 'Sala', 'CX': 'Caixa', 'BOX': 'Box', 'UTI': 'UTI',
      'SPA': 'SPA', 'LBX': 'Laboratório', 'LT': 'Leito'
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

export async function generateSampleTransformation(config: IntegrationConfig) {
  const sampleData = [
    { [config.fieldMappings.codeField]: "QTO101", [config.fieldMappings.statusField]: config.statusMappings.available },
    { [config.fieldMappings.codeField]: "APTO202", [config.fieldMappings.statusField]: config.statusMappings.occupied },
  ];
  
  const transformer = new DataTransformer(config);
  return await transformer.transform(sampleData);
}
