'use server';

import { revalidatePath } from 'next/cache';
import { dbConnect } from './db';
import { CreateAsgSchema, StartCleaningFormSchema, UpdateAsgSchema, UpdateCleaningSettingsSchema, ReportFiltersSchema, type CleaningRecord, LoginSchema, CreateUserSchema, UpdateUserSchema, IntegrationConfigSchema, type IntegrationConfig } from './schemas';
import type { CleaningType } from './schemas';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME, encrypt, getSession } from './session';
import { convertToPlainObject } from './utils';

// --- Logger Action ---
async function logAction(action: string, details: Record<string, any>) {
  try {
    const db = await dbConnect();
    const session = await getSession();
    await db.collection('app_logs').insertOne({
      action,
      details,
      timestamp: new Date(),
      user: session?.user?.login ?? 'system',
    });
  } catch (error) {
    console.error("Failed to write to log:", error);
  }
}

// --- Auth Actions ---

export async function login(prevState: any, formData: FormData) {
  const validatedFields = LoginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      error: 'Login e senha são obrigatórios.',
    };
  }

  const { login, password } = validatedFields.data;
  const db = await dbConnect();
  
  const user = await db.collection('users').findOne({ login: login, password: password, active: true });

  if (!user) {
    await logAction('login_failed', { login, reason: 'Invalid credentials or inactive user.' });
    return { error: 'Credenciais inválidas ou usuário inativo.' };
  }

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  const session = await encrypt({ user: { _id: user._id.toString(), name: user.name, login: user.login }, expires });

  cookies().set(SESSION_COOKIE_NAME, session, { expires, httpOnly: true });

  await logAction('login_success', { login });
  redirect('/dashboard');
}

export async function logout() {
  const session = await getSession();
  await logAction('logout', { login: session?.user?.login });
  cookies().set(SESSION_COOKIE_NAME, '', { expires: new Date(0) });
  redirect('/login');
}


// --- Location Actions ---

export async function getLocations() {
  const db = await dbConnect();
  const locations = await db.collection('locations').find().sort({ name: 1, number: 1 }).toArray();
  return convertToPlainObject(locations);
}

export async function startCleaning(prevState: any, formData: FormData) {
  const validatedFields = StartCleaningFormSchema.safeParse({
    locationId: formData.get('locationId'),
    asgId: formData.get('asgId'),
    type: formData.get('type'),
  });

  if (!validatedFields.success) {
    return {
      error: "Dados inválidos. Por favor, verifique os campos.",
    };
  }
  
  const { locationId, asgId, type } = validatedFields.data;

  const db = await dbConnect();
  const location = await db.collection('locations').findOne({ _id: new ObjectId(locationId) });
  const asg = await db.collection('asgs').findOne({ _id: new ObjectId(asgId) });


  if (!location || !asg) {
    return { error: 'Local ou colaborador não encontrado.' };
  }
  if (asg.status === 'busy') {
    return { error: 'Colaborador já está ocupado.' };
  }
   if (location.status === 'in_cleaning') {
    return { error: 'Este local já está em higienização.' };
  }


  await db.collection('locations').updateOne({ _id: new ObjectId(locationId) }, {
    $set: {
        status: 'in_cleaning',
        currentCleaning: {
            type,
            asgId: new ObjectId(asgId),
            asgName: asg.name,
            startTime: new Date(),
        },
        updatedAt: new Date()
    }
  });

  await db.collection('asgs').updateOne({ _id: new ObjectId(asgId) }, { $set: { status: 'busy' } });

  revalidatePath('/');
  revalidatePath('/dashboard');
  return { success: true, message: 'Higienização iniciada com sucesso!' };
}

export async function finishCleaning(locationId: string) {
  const db = await dbConnect();
  const location = await db.collection('locations').findOne({ _id: new ObjectId(locationId) });

  if (!location || !location.currentCleaning) {
    return { error: 'Higienização não encontrada para este local.' };
  }

  const { asgId, type, startTime, asgName } = location.currentCleaning;
  
  const settings = await getCleaningSettings();
  const expectedDuration = settings[type];
  const finishTime = new Date();
  const actualDuration = Math.round((finishTime.getTime() - new Date(startTime).getTime()) / (1000 * 60));
  const isDelayed = actualDuration > expectedDuration;


  if (isDelayed) {
    const delayInMinutes = actualDuration - expectedDuration;
    await db.collection('cleaning_occurrences').insertOne({
      locationName: `${location.name} - ${location.number}`,
      cleaningType: type,
      asgName: asgName,
      delayInMinutes: delayInMinutes,
      occurredAt: finishTime,
    });
  }

  const record: Omit<CleaningRecord, '_id'> = {
    locationName: `${location.name} - ${location.number}`,
    cleaningType: type,
    asgName: asgName,
    startTime: startTime,
    finishTime: finishTime,
    expectedDuration: expectedDuration,
    actualDuration: actualDuration,
    status: 'completed',
    delayed: isDelayed,
    date: finishTime,
  };
  await db.collection('cleaning_records').insertOne(record);


  const newStatus = type === 'terminal' ? 'available' : 'occupied';

  await db.collection('locations').updateOne({ _id: new ObjectId(locationId) }, {
    $set: {
        status: newStatus,
        currentCleaning: null,
        updatedAt: new Date()
    },
  });

  await db.collection('asgs').updateOne({ _id: new ObjectId(asgId) }, { $set: { status: 'available' } });

  revalidatePath('/');
  revalidatePath('/dashboard');
  return { success: true, message: 'Higienização finalizada com sucesso!' };
}

// --- ASG Actions ---

export async function getAsgs() {
  const db = await dbConnect();
  const asgs = await db.collection('asgs').find().sort({ name: 1 }).toArray();
  return convertToPlainObject(asgs);
}

export async function getNextAsgCode() {
    const db = await dbConnect();
    const lastAsg = await db.collection('asgs').find().sort({ code: -1 }).limit(1).toArray();
    
    if (lastAsg.length === 0) {
      return 'ASG001';
    }

    const lastCode = lastAsg[0].code;
    const lastNumber = parseInt(lastCode.replace('ASG', ''), 10);
    const nextNumber = lastNumber + 1;
    return `ASG${String(nextNumber).padStart(3, '0')}`;
}

export async function createAsg(prevState: any, formData: FormData) {
  console.log('🎯 CREATE_ASG INICIADA');
  
  try {
    const nextCode = await getNextAsgCode();
    
    const rawData = {
      name: formData.get('name'),
      code: nextCode,
    };

    const validatedFields = CreateAsgSchema.safeParse(rawData);
    
    if (!validatedFields.success) {
      return {
        error: "Dados inválidos.",
        fieldErrors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const db = await dbConnect();
    
    await db.collection('asgs').insertOne({ 
      ...validatedFields.data, 
      status: 'available',
      active: true, 
      createdAt: new Date() 
    });
    
    revalidatePath('/dashboard');
    
    return { success: true, message: 'Colaborador adicionado com sucesso!' };
    
  } catch (error: any) {
    console.error('💥 ERRO EM CREATE_ASG:', error);
    return { error: 'Erro de banco de dados: ' + error.message };
  }
}


export async function updateAsg(id: string, prevState: any, formData: FormData) {
    const validatedFields = UpdateAsgSchema.safeParse({
        name: formData.get('name'),
        code: formData.get('code'),
        active: formData.get('active') === 'on',
    });

    if (!validatedFields.success) {
        return {
            error: "Dados inválidos.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const db = await dbConnect();
    await db.collection('asgs').updateOne({ _id: new ObjectId(id) }, { $set: { ...validatedFields.data } });

    revalidatePath('/');
    revalidatePath('/dashboard');
    return { success: true, message: 'Colaborador atualizado com sucesso!' };
}

export async function toggleAsgActive(id: string, active: boolean) {
  const db = await dbConnect();
  const asg = await db.collection('asgs').findOne({ _id: new ObjectId(id) });
  if (asg?.status === 'busy') {
    return { error: 'Não é possível desativar um colaborador em higienização.' };
  }
  await db.collection('asgs').updateOne({ _id: new ObjectId(id) }, { $set: { active } });
  revalidatePath('/');
  revalidatePath('/dashboard');
  return { success: true, message: `Colaborador ${active ? 'ativado' : 'desativado'} com sucesso!` };
}

// --- Settings Actions ---

export async function getCleaningSettings() {
  const db = await dbConnect();
  const settings = await db.collection('system_settings').findOne({ _id: 'default' });
  if (settings) {
    // @ts-ignore
    delete settings._id;
    return settings;
  }
  return { concurrent: 30, terminal: 45 };
}

export async function updateCleaningSettings(prevState: any, formData: FormData) {
  const validatedFields = UpdateCleaningSettingsSchema.safeParse({
    concurrent: Number(formData.get('concurrent')),
    terminal: Number(formData.get('terminal')),
  });

  if (!validatedFields.success) {
    return {
      error: "Dados inválidos.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const db = await dbConnect();
  await db.collection('system_settings').updateOne(
    { _id: 'default' }, 
    { $set: validatedFields.data },
    { upsert: true }
  );

  revalidatePath('/'); 
  revalidatePath('/dashboard');
  return { success: true, message: "Tempos de limpeza atualizados com sucesso!" };
}

// --- Occurrences Actions ---

export async function getCleaningOccurrences() {
    const db = await dbConnect();
    const occurrences = await db.collection('cleaning_occurrences').find().sort({ occurredAt: -1 }).toArray();
    return convertToPlainObject(occurrences);
}

// --- Report Actions ---
export async function generateReport(prevState: any, formData: FormData) {
    const data = {
        month: formData.get('month') as string,
        year: formData.get('year') as string,
        cleaningTypes: formData.getAll('cleaningTypes'),
    }

    const validatedFields = ReportFiltersSchema.safeParse(data);
    
    if (!validatedFields.success) {
        return {
            error: "Dados de filtro inválidos. Selecione mês, ano e ao menos um tipo de limpeza.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const db = await dbConnect();
    const { month, year, cleaningTypes } = validatedFields.data;
    
    const monthIndex = parseInt(month, 10);
    const yearIndex = parseInt(year, 10);
    
    const startDate = new Date(yearIndex, monthIndex - 1, 1);
    const endDate = new Date(yearIndex, monthIndex, 0, 23, 59, 59);

    const cleaningRecords = await db.collection('cleaning_records').find({
        date: { $gte: startDate, $lte: endDate },
        cleaningType: { $in: cleaningTypes }
    }).toArray() as CleaningRecord[];

    const total = cleaningRecords.length;
    const concurrent = cleaningRecords.filter(r => r.cleaningType === 'concurrent').length;
    const terminal = cleaningRecords.filter(r => r.cleaningType === 'terminal').length;
    const delayed = cleaningRecords.filter(r => r.delayed).length;
    const onTime = total - delayed;
    const delayedConcurrent = cleaningRecords.filter(r => r.delayed && r.cleaningType === 'concurrent').length;
    const delayedTerminal = cleaningRecords.filter(r => r.delayed && r.cleaningType === 'terminal').length;


    return {
        success: true,
        report: {
            total,
            concurrent,
            terminal,
            onTime,
            onTimePercent: total > 0 ? (onTime / total) * 100 : 0,
            delayed,
            delayedPercent: total > 0 ? (delayed / total) * 100 : 0,
            delayedConcurrent,
            delayedTerminal,
            filters: validatedFields.data
        }
    }
}

// --- User Actions ---

export async function getUsers() {
    const db = await dbConnect();
    const users = await db.collection('users').find().sort({ name: 1 }).toArray();
    return convertToPlainObject(users);
}

export async function createUser(prevState: any, formData: FormData) {
  const validatedFields = CreateUserSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      error: "Dados inválidos.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { login } = validatedFields.data;
  const db = await dbConnect();
  
  const existingUser = await db.collection('users').findOne({ login });
  if (existingUser) {
    return {
      error: "Dados inválidos.",
      fieldErrors: { login: ['Este login já está em uso.'] },
    }
  }

  await db.collection('users').insertOne({ 
      ...validatedFields.data, 
      active: true, 
      createdAt: new Date() 
  });

  revalidatePath('/dashboard');
  return { success: true, message: 'Usuário adicionado com sucesso!' };
}

export async function updateUser(id: string, prevState: any, formData: FormData) {
    const password = formData.get('password') as string;

    const validatedFields = UpdateUserSchema.safeParse({
        name: formData.get('name'),
        login: formData.get('login'),
        active: formData.get('active') === 'on',
        password: password || undefined,
    });

    if (!validatedFields.success) {
        return {
            error: "Dados inválidos.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const db = await dbConnect();
    const { login } = validatedFields.data;
    
    const existingUser = await db.collection('users').findOne({ login, _id: { $ne: new ObjectId(id) } });
    if (existingUser) {
        return {
            error: "Dados inválidos.",
            fieldErrors: { login: ['Este login já está em uso.'] },
        }
    }

    const dataToUpdate: any = { ...validatedFields.data };
    if (!dataToUpdate.password) {
        delete dataToUpdate.password;
    }

    await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: dataToUpdate });

    revalidatePath('/dashboard');
    return { success: true, message: 'Usuário atualizado com sucesso!' };
}

export async function toggleUserActive(id: string, active: boolean) {
  const db = await dbConnect();
  const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
  if (user?.login === 'admin' && !active) {
    return { error: 'Não é possível desativar o usuário administrador.' };
  }
  await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: { active } });
  revalidatePath('/dashboard');
  return { success: true, message: `Usuário ${active ? 'ativado' : 'desativado'} com sucesso!` };
}

// --- Log Actions ---
export async function getLogs() {
  const db = await dbConnect();
  const logs = await db.collection('app_logs').find().sort({ timestamp: -1 }).limit(100).toArray();
  return convertToPlainObject(logs);
}


// --- Integration Actions ---

const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig = {
  _id: 'integration_settings',
  enabled: false,
  host: '',
  port: 5432,
  database: '',
  username: '',
  password: '',
  syncInterval: 5,
  query: "SELECT code1, tipobloq FROM cable1 WHERE tipobloq IN ('*', 'L')",
  statusMappings: {
    available: 'L',
    occupied: '*'
  },
  fieldMappings: {
    codeField: 'code1',
    statusField: 'tipobloq', 
    nameSeparator: ' '
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

export async function getIntegrationConfig(): Promise<IntegrationConfig> {
  try {
    const db = await dbConnect();
    const collection = db.collection('integration_config');
    
    const config = await collection.findOne({ _id: 'integration_settings' });
    
    if (!config) {
      // @ts-ignore
      return DEFAULT_INTEGRATION_CONFIG;
    }
    
    // @ts-ignore
    return convertToPlainObject(config);
  } catch (error) {
    console.error('Erro ao buscar configuração de integração:', error);
    // @ts-ignore
    return DEFAULT_INTEGRATION_CONFIG;
  }
}

export async function validateIntegrationConfig(configData: any) {
  try {
    const validated = IntegrationConfigSchema.parse(configData);
    
    if (configData.host && !configData.host.includes('.')) {
      return { isValid: false, message: 'Host deve ser um endereço válido' };
    }
    
    if (configData.port && (configData.port < 1 || configData.port > 65535)) {
      return { isValid: false, message: 'Porta deve estar entre 1 e 65535' };
    }
    
    return { isValid: true, data: validated };
  } catch (error) {
    return { isValid: false, message: 'Dados de configuração inválidos' };
  }
}

export async function saveIntegrationConfig(configData: Partial<IntegrationConfig>) {
  try {
    const db = await dbConnect();
    const collection = db.collection('integration_config');
    
    const validation = await validateIntegrationConfig(configData);
    if (!validation.isValid) {
      return { 
        success: false, 
        message: validation.message 
      };
    }

    const result = await collection.updateOne(
      { _id: 'integration_settings' },
      { 
        $set: {
          ...validation.data,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    revalidatePath('/dashboard');

    return { 
      success: true, 
      message: 'Configurações salvas com sucesso',
      data: validation.data
    };
  } catch (error: any) {
    console.error('Erro ao salvar configuração de integração:', error);
    return { 
      success: false, 
      message: 'Erro ao salvar configurações: ' + error.message 
    };
  }
}

export async function testIntegrationConnection(configData: any) {
  try {
    const { testExternalConnection } = await import('./external-db-connection');
    const result = await testExternalConnection(configData);
    return result;
  } catch (error: any) {
    console.error('Erro no teste de conexão:', error);
    return {
      success: false,
      message: `Erro no teste de conexão: ${error.message}`
    };
  }
}

export async function runManualSync() {
  try {
    const db = await dbConnect();
    const config = await getIntegrationConfig();
    
    if (!config.enabled) {
      return {
        success: false,
        message: 'Integração não está ativada. Ative a integração primeiro.'
      };
    }

    if (!config.host || !config.database || !config.username) {
      return {
        success: false,
        message: 'Configuração incompleta. Verifique host, banco e usuário.'
      };
    }

    console.log('Iniciando sincronização manual...');
    
    // 1. Buscar dados do banco externo
    const { fetchExternalData } = await import('./external-db-connection');
    const externalData = await fetchExternalData(config);
    
    if (externalData.length === 0) {
      return {
        success: true,
        message: 'Sincronização concluída. Nenhum dado encontrado no sistema externo.',
        stats: { updated: 0, total: 0 }
      };
    }

    // 2. Transformar dados
    const { transformLeitoData, validateTransformedData } = await import('./data-transformation');
    const transformedData = transformLeitoData(externalData, config);
    const { valid: validData, invalid: invalidData } = validateTransformedData(transformedData);
    
    console.log(`Dados válidos: ${validData.length}, Inválidos: ${invalidData.length}`);

    // 3. Atualizar MongoDB Atlas
    const locationsCollection = db.collection('locations');
    let updatedCount = 0;

    for (const leito of validData) {
      // NÃO atualizar leitos que estão em higienização
      const existingLeito = await locationsCollection.findOne({
        name: leito.name,
        number: leito.number,
        status: { $ne: 'in_cleaning' } // Não sobrescrever se estiver em limpeza
      });

      if (existingLeito) {
        // Atualizar apenas se o status mudou
        if (existingLeito.status !== leito.status) {
          await locationsCollection.updateOne(
            { _id: existingLeito._id },
            { 
              $set: { 
                status: leito.status,
                updatedAt: new Date()
              }
            }
          );
          updatedCount++;
        }
      } else {
        // Criar novo leito
        await locationsCollection.insertOne({
          ...leito,
          currentCleaning: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        updatedCount++;
      }
    }

    // 4. Atualizar último sync
    const integrationCollection = db.collection('integration_config');
    await integrationCollection.updateOne(
      { _id: 'integration_settings' },
      { $set: { lastSync: new Date() } }
    );

    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Sincronização concluída com sucesso! ${updatedCount} leitos atualizados.`,
      stats: {
        updated: updatedCount,
        total: validData.length,
        invalid: invalidData.length
      }
    };

  } catch (error: any) {
    console.error('Erro na sincronização manual:', error);
    return {
      success: false,
      message: `Erro na sincronização: ${error.message}`,
      stats: { updated: 0, total: 0, invalid: 0 }
    };
  }
}

export async function getSyncStatus() {
  try {
    const config = await getIntegrationConfig();
    return {
      lastSync: config.lastSync,
      enabled: config.enabled,
      syncInterval: config.syncInterval
    };
  } catch (error) {
    return {
      lastSync: null,
      enabled: false,
      syncInterval: 5
    };
  }
}
