import { Client } from 'pg';
import { IntegrationConfig } from './schemas';

export interface ExternalLeito {
  [key: string]: any;
}

function getPgClientConfig() {
  return {
    host:     process.env.PG_HOST     || 'localhost',
    port:     parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DB       || '',
    user:     process.env.PG_USER     || '',
    password: process.env.PG_PASS     || '',
  };
}

export async function testExternalConnection() {
  const client = new Client({ ...getPgClientConfig(), connectionTimeoutMillis: 5000 });

  try {
    await client.connect();
    await client.query('SELECT 1 as connection_test');
    await client.end();
    return { success: true, message: 'Conexão com banco externo estabelecida com sucesso!' };
  } catch (error: any) {
    console.error('Erro na conexão externa:', error);

    if (error.code === 'ECONNREFUSED') {
      return { success: false, message: 'Não foi possível conectar ao servidor. Verifique host e porta.' };
    } else if (error.code === '28P01' || error.code === '3D000') {
      return { success: false, message: 'Autenticação ou seleção de banco de dados falhou. Verifique as credenciais e o nome do banco.' };
    } else {
      return { success: false, message: `Erro de conexão: ${error.message}` };
    }
  }
}

export async function fetchExternalData(config: IntegrationConfig): Promise<ExternalLeito[]> {
  const client = new Client(getPgClientConfig());

  try {
    await client.connect();
    console.log('Executando query externa:', config.query);
    const result = await client.query(config.query);
    await client.end();
    console.log(`Dados recebidos: ${result.rows.length} leitos`);
    return result.rows;
  } catch (error: any) {
    console.error('Erro ao buscar dados externos:', error);
    await client.end();
    throw new Error(`Falha ao executar query: ${error.message}`);
  }
}
