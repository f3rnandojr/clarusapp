
'use server';

import { revalidatePath } from 'next/cache';
import { dbConnect } from './db';
import { CreateAsgSchema, StartCleaningFormSchema, UpdateAsgSchema, UpdateCleaningSettingsSchema, ReportFiltersSchema, type CleaningRecord, LoginSchema, CreateUserSchema, UpdateUserSchema, IntegrationConfigSchema, type IntegrationConfig, CreateAreaSchema, UpdateAreaSchema, LocationSchema, type Location, CreateLocationMappingSchema, UpdateLocationMappingSchema, ScheduledRequest, ScheduledRequestSchema, ActiveCleaningSchema, type ActiveCleaning } from './schemas';
import type { CleaningType, UserProfile } from './schemas';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME, encrypt, getSession } from './session';
import { convertToPlainObject } from './utils';
import { DataTransformer, validateTransformationConfig, generateSampleTransformation } from './advanced-transformation';
import { syncLogger } from './logger';
import { syncService } from './sync-service'; // Garante que o serviço seja inicializado


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

  // CORREÇÃO: Garante que o usuário 'admin' sempre tenha o perfil correto
  if (user.login === 'admin' && user.perfil !== 'admin') {
    await db.collection('users').updateOne({ _id: user._id }, { $set: { perfil: 'admin' } });
    user.perfil = 'admin'; // Atualiza o objeto em memória para a sessão atual
    console.log("Perfil do administrador corrigido para 'admin' durante o login.");
  }


  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  const session = await encrypt({ user: { _id: user._id.toString(), name: user.name, login: user.login, perfil: user.perfil || 'usuario' }, expires });

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

// --- Location and Active Cleaning Actions ---

export async function getActiveCleanings() {
    const db = await dbConnect();
    const activeCleanings = await db.collection('active_cleanings').find().toArray();
    return convertToPlainObject(activeCleanings);
}

const getLocationById = async (id: string): Promise<Location | null> => {
    if (!ObjectId.isValid(id)) {
        return null;
    }
    const db = await dbConnect();
    const objectId = new ObjectId(id);

    // Tenta encontrar em 'locations' (leitos) ou 'areas'
    let item = await db.collection('locations').findOne({ _id: objectId }) || await db.collection('areas').findOne({ _id: objectId });

    if (!item) return null;

    // Constrói o objeto Location unificado
    const isArea = !!item.setor; 
    const location: Location = {
        _id: item._id,
        name: isArea ? item.setor : item.name,
        number: isArea ? item.shortCode : item.number,
        status: item.status,
        currentCleaning: item.currentCleaning || null,
        externalCode: isArea ? item.locationId : item.externalCode,
        locationType: isArea ? 'area' : 'leito',
        setor: isArea ? item.setor : 'Sem Setor', // Assumindo que leitos não têm setor direto
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };

    return convertToPlainObject(location);
};

export async function getLocations(): Promise<Location[]> {
  const db = await dbConnect();

  const [leitos, areas, mappings, activeCleanings] = await Promise.all([
      db.collection('locations').find().sort({ name: 1, number: 1 }).toArray(),
      db.collection('areas').find({isActive: true}).sort({ setor: 1 }).toArray(),
      db.collection('location_mappings').find({ isActive: true }).toArray(),
      db.collection('active_cleanings').find().toArray()
  ]);

  const mappingsByExternalCode = mappings.reduce((acc, m) => {
    acc[m.externalCode] = m;
    return acc;
  }, {} as Record<string, any>);

  const activeCleaningsByLocationId = activeCleanings.reduce((acc, ac) => {
    acc[ac.locationId] = ac;
    return acc;
  }, {} as Record<string, ActiveCleaning>);

  const combinedLocations: Location[] = [];

  // Process Leitos
  leitos.forEach(leito => {
    const mapping = mappingsByExternalCode[leito.externalCode];
    const activeCleaning = activeCleaningsByLocationId[leito._id.toString()];
    const status = activeCleaning ? 'in_cleaning' : leito.status;

    combinedLocations.push({
      _id: leito._id,
      name: mapping ? mapping.internalName : leito.name,
      number: mapping ? mapping.internalNumber : leito.number,
      status: status,
      currentCleaning: activeCleaning ? {
          type: activeCleaning.cleaningType,
          userId: activeCleaning.userId,
          userName: activeCleaning.userName,
          startTime: activeCleaning.startTime
      } : null,
      externalCode: leito.externalCode,
      locationType: 'leito',
      setor: mapping ? mapping.setor : 'Sem Setor',
      createdAt: leito.createdAt,
      updatedAt: leito.updatedAt,
    });
  });

  // Process Areas
  areas.forEach(area => {
    const activeCleaning = activeCleaningsByLocationId[area._id.toString()];
    const status = activeCleaning ? 'in_cleaning' : (area.status || 'available');
    
    combinedLocations.push({
      _id: area._id,
      name: area.setor,
      number: area.shortCode,
      status: status,
      currentCleaning: activeCleaning ? {
          type: activeCleaning.cleaningType,
          userId: activeCleaning.userId,
          userName: activeCleaning.userName,
          startTime: activeCleaning.startTime
      } : null,
      externalCode: area.locationId,
      locationType: 'area',
      setor: area.setor,
      createdAt: area.createdAt,
      updatedAt: area.updatedAt,
    });
  });

  // Ordena a lista combinada
  combinedLocations.sort((a, b) => {
    if (a.setor < b.setor) return -1;
    if (a.setor > b.setor) return 1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    const numA = parseInt(a.number, 10) || a.number;
    const numB = parseInt(b.number, 10) || b.number;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
    return 0;
  });

  return convertToPlainObject(combinedLocations);
}

export async function getLocationByCode(code: string) {
    const db = await dbConnect();
    
    // Find in mappings
    let mapping = await db.collection('location_mappings').findOne({ locationId: code, isActive: true });
    if (mapping) {
        let locationData = {
            _id: mapping._id.toString(),
            name: mapping.internalName,
            number: mapping.internalNumber,
            status: 'available' as LocationStatus,
            currentCleaning: null,
            externalCode: mapping.externalCode,
            locationType: mapping.type as 'leito' | 'area',
            setor: mapping.setor,
            createdAt: mapping.createdAt,
            updatedAt: mapping.updatedAt,
        };

        const activeCleaning = await db.collection('active_cleanings').findOne({ locationId: locationData._id });

        if (activeCleaning) {
            locationData.status = 'in_cleaning';
            // @ts-ignore
            locationData.currentCleaning = {
                type: activeCleaning.cleaningType,
                userId: activeCleaning.userId,
                userName: activeCleaning.userName,
                startTime: activeCleaning.startTime
            };
        } else {
             // If no active cleaning, get status from original collection
             let originalItem;
             if(locationData.locationType === 'leito') {
                 originalItem = await db.collection('locations').findOne({_id: new ObjectId(locationData._id)})
             } else {
                 originalItem = await db.collection('areas').findOne({_id: new ObjectId(locationData._id)})
             }
             if(originalItem) locationData.status = originalItem.status;
        }
        return convertToPlainObject(locationData);
    }
    
    // Fallback to areas and locations if no mapping
    let item: any = await db.collection('areas').findOne({ locationId: code, isActive: true }) || await db.collection('locations').findOne({ externalCode: code });
    if (!item) return null;

    const isArea = !!item.setor; // Simple check
    const locationId = isArea ? item._id.toString() : item._id.toString();
    const activeCleaning = await db.collection('active_cleanings').findOne({ locationId: locationId });
    
    const status = activeCleaning ? 'in_cleaning' : item.status;
    const currentCleaning = activeCleaning ? {
        type: activeCleaning.cleaningType,
        userId: activeCleaning.userId,
        userName: activeCleaning.userName,
        startTime: activeCleaning.startTime
    } : null;

    if (isArea) {
        return convertToPlainObject({
            _id: item._id, name: item.setor, number: item.shortCode, status, currentCleaning,
            externalCode: item.locationId, locationType: 'area', setor: item.setor,
            createdAt: item.createdAt, updatedAt: item.updatedAt,
        });
    } else {
        return convertToPlainObject({
            ...item, status, currentCleaning, locationType: 'leito',
        });
    }
}

export async function startCleaning(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Usuário não autenticado. Por favor, faça login novamente." };
  }

  const { user } = session;
  const locationId = formData.get('locationId') as string;
  const type = formData.get('type') as CleaningType;

  if (!locationId || !type) {
    return { success: false, error: 'Dados da solicitação inválidos.' };
  }
  
  const db = await dbConnect();
  const location = await getLocationById(locationId);

  if (!location) {
    return { success: false, error: 'Local não encontrado.' };
  }

  // Check if cleaning is already active for this location
  const existingCleaning = await db.collection('active_cleanings').findOne({ locationId: location._id.toString() });
  if (existingCleaning) {
      return { success: false, error: 'Este local já está em higienização.' };
  }

  const cleaningSettings = await getCleaningSettings();
  const expectedDuration = cleaningSettings[type];
  
  const newActiveCleaning: Omit<ActiveCleaning, '_id'> = {
      locationId: location._id.toString(),
      locationName: `${location.name} - ${location.number}`,
      locationType: location.locationType,
      cleaningType: type,
      userId: new ObjectId(user._id),
      userName: user.name,
      startTime: new Date(),
      status: 'in_progress',
      expectedDuration: expectedDuration
  };

  await db.collection('active_cleanings').insertOne(newActiveCleaning);

  // Update location status in its original collection
  const collectionName = location.locationType === 'leito' ? 'locations' : 'areas';
  await db.collection(collectionName).updateOne({_id: new ObjectId(location._id)}, {$set: { status: 'in_cleaning', updatedAt: new Date() }});

  revalidatePath('/dashboard');
  return { success: true, message: `Higienização ${type} iniciada com sucesso!` };
}

export async function finishCleaning(locationId: string) {
  console.log(`[finishCleaning] Iniciando finalização para locationId: ${locationId}`);
  const db = await dbConnect();
  
  const activeCleaning = await db.collection('active_cleanings').findOne({ locationId: locationId.toString() });

  if (!activeCleaning) {
    console.error(`[finishCleaning] Nenhuma higienização ativa encontrada para locationId: ${locationId}`);
    // DEBUG: Listar todas as active_cleanings para ver o que existe
    const allActive = await db.collection('active_cleanings').find().toArray();
    console.log('[finishCleaning] Todas as active_cleanings no banco:', allActive.map(ac => ({...ac, locationId: ac.locationId.toString()})));
    
    return { error: 'Higienização ativa não encontrada para este local.' };
  }
  
  console.log(`[finishCleaning] Higienização ativa encontrada:`, activeCleaning);

  const finishTime = new Date();
  const actualDuration = Math.round((finishTime.getTime() - new Date(activeCleaning.startTime).getTime()) / (1000 * 60));
  const isDelayed = actualDuration > activeCleaning.expectedDuration;

  if (isDelayed) {
    await db.collection('cleaning_occurrences').insertOne({
      locationName: activeCleaning.locationName,
      cleaningType: activeCleaning.cleaningType,
      userName: activeCleaning.userName,
      delayInMinutes: actualDuration - activeCleaning.expectedDuration,
      occurredAt: finishTime,
    });
    console.log(`[finishCleaning] Ocorrência de atraso registrada.`);
  }

  const record: Omit<CleaningRecord, '_id'> = {
    locationId: activeCleaning.locationId,
    locationName: activeCleaning.locationName,
    locationType: activeCleaning.locationType as 'leito' | 'area',
    cleaningType: activeCleaning.cleaningType as CleaningType,
    userId: new ObjectId(activeCleaning.userId),
    userName: activeCleaning.userName,
    startTime: activeCleaning.startTime,
    finishTime: finishTime,
    expectedDuration: activeCleaning.expectedDuration,
    actualDuration: actualDuration,
    status: 'completed',
    delayed: isDelayed,
    date: finishTime,
  };
  await db.collection('cleaning_records').insertOne(record);
  console.log(`[finishCleaning] Registro de histórico de limpeza criado.`);

  // Remove from active cleanings
  await db.collection('active_cleanings').deleteOne({ _id: activeCleaning._id });
  console.log(`[finishCleaning] Registro de higienização ativa removido.`);

  // Update location status
  const collectionName = activeCleaning.locationType === 'leito' ? 'locations' : 'areas';
  await db.collection(collectionName).updateOne(
      { _id: new ObjectId(locationId) }, 
      { $set: { status: 'available', currentCleaning: null, updatedAt: new Date() }}
  );
  console.log(`[finishCleaning] Status do local (${collectionName}) atualizado para 'available'.`);

  revalidatePath('/dashboard');
  return { success: true, message: 'Higienização finalizada com sucesso!' };
}

// --- Location Mappings Actions ---
export async function getLocationMappings() {
    const db = await dbConnect();
    const mappings = await db.collection('location_mappings').find().sort({ setor: 1, internalName: 1 }).toArray();
    return convertToPlainObject(mappings);
}

function generateCodes(data: { internalName: string, internalNumber: string }) {
    const locationId = `${data.internalName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${data.internalNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    
    const namePart = data.internalName.substring(0, 2).toUpperCase();
    const numberPart = data.internalNumber.toUpperCase();
    const shortCode = `${namePart}${numberPart}`;

    return {
        locationId,
        qrCodeUrl: `/clean/${locationId}`,
        shortCode,
    };
}


export async function createLocationMapping(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = CreateLocationMappingSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            error: "Dados inválidos.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { externalCode, internalName, internalNumber } = validatedFields.data;

    const db = await dbConnect();
    const existing = await db.collection('location_mappings').findOne({ externalCode });
    if (existing) {
        return {
            error: "Código externo já mapeado.",
            fieldErrors: { externalCode: ["Este código externo já está em uso."] },
        };
    }
    
    const codes = generateCodes({ internalName, internalNumber });

    const newMapping = {
        ...validatedFields.data,
        ...codes,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    await db.collection('location_mappings').insertOne(newMapping);
    revalidatePath('/dashboard');
    return { success: true, message: 'Mapeamento criado com sucesso!' };
}

export async function updateLocationMapping(id: string, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = UpdateLocationMappingSchema.safeParse(rawData);
    
    if (!validatedFields.success) {
        return {
            error: "Dados inválidos.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { internalName, internalNumber } = validatedFields.data;
    const codes = generateCodes({ internalName, internalNumber });

    const dataToUpdate = {
        ...validatedFields.data,
        ...codes,
        updatedAt: new Date(),
    };

    const db = await dbConnect();
    await db.collection('location_mappings').updateOne({ _id: new ObjectId(id) }, { $set: dataToUpdate });

    revalidatePath('/dashboard');
    return { success: true, message: 'Mapeamento atualizado com sucesso!' };
}

export async function toggleLocationMappingActive(id: string, isActive: boolean) {
    const db = await dbConnect();
    await db.collection('location_mappings').updateOne({ _id: new ObjectId(id) }, { $set: { isActive, updatedAt: new Date() } });
    revalidatePath('/dashboard');
    return { success: true, message: `Mapeamento ${isActive ? 'ativado' : 'desativado'} com sucesso!` };
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
  revalidatePath('/dashboard');
  return { success: true, message: `Colaborador ${active ? 'ativado' : 'desativado'} com sucesso!` };
}

// --- Area (QR Code) Actions ---

export async function getAreas() {
    const db = await dbConnect();
    const areas = await db.collection('areas').find().sort({ setor: 1, locationId: 1 }).toArray();
    return convertToPlainObject(areas);
}

export async function createArea(prevState: any, formData: FormData) {
    console.log('🔴🔴🔴 CREATE AREA INICIADO - ESTAMOS AQUI!');
    console.log('🔴 FormData recebido:', formData);
    
    try {
        const rawData = {
            setor: formData.get('setor'),
            locationId: formData.get('locationId'),
            description: formData.get('description'),
        };

        const validatedFields = CreateAreaSchema.safeParse(rawData);

        if (!validatedFields.success) {
            console.log('❌ Validação do formulário falhou:', validatedFields.error.flatten());
            return {
                error: "Dados inválidos.",
                fieldErrors: validatedFields.error.flatten().fieldErrors,
                success: false,
                message: 'Por favor, corrija os erros no formulário.'
            };
        }

        const { locationId, setor, description } = validatedFields.data;
        console.log('📝 Dados validados:', { setor, locationId, description });

        console.log('🗄️ Tentando conectar com MongoDB...');
        const db = await dbConnect();
        console.log('🗄️ Conexão com MongoDB estabelecida.');

        const existingArea = await db.collection('areas').findOne({ locationId });
        if (existingArea) {
            console.log('⚠️ Tentativa de criar área com locationId duplicado:', locationId);
            return { 
                error: 'O ID da Localização já está em uso.', 
                fieldErrors: { locationId: ['Este ID já está em uso.'] },
                success: false,
                message: ''
            };
        }

        const newArea = {
            setor,
            locationId,
            description: description || '',
            qrCodeUrl: `/clean/${locationId}`,
            shortCode: locationId.replace(/-/g, '').toUpperCase(),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        console.log('➕ Tentando inserir nova área no banco de dados:', newArea);
        await db.collection('areas').insertOne(newArea);
        console.log('✅ Área criada com sucesso no banco de dados.');

        revalidatePath('/dashboard');
        return { success: true, message: 'Área criada com sucesso!', fieldErrors: {}, error: null };
    } catch (error: any) {
        console.error('💥 Erro fatal em createArea:', error);
        console.error('📌 Detalhes do erro:', error.message, error.stack);
        return {
            error: 'Erro interno do servidor ao criar área.',
            fieldErrors: {},
            success: false,
            message: error.message // Retorna a mensagem de erro real
        };
    }
}


export async function updateArea(id: string, prevState: any, formData: FormData) {
    const rawData = {
        setor: formData.get('setor'),
        description: formData.get('description'),
    };

    const validatedFields = UpdateAreaSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            error: "Dados inválidos.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    const dataToUpdate = {
        ...validatedFields.data,
        updatedAt: new Date(),
    };

    const db = await dbConnect();
    await db.collection('areas').updateOne({ _id: new ObjectId(id) }, { $set: dataToUpdate });

    revalidatePath('/dashboard');
    return { success: true, message: 'Área atualizada com sucesso!' };
}

export async function toggleAreaActive(id: string, isActive: boolean) {
    const db = await dbConnect();
    await db.collection('areas').updateOne({ _id: new ObjectId(id) }, { $set: { isActive, updatedAt: new Date() } });
    revalidatePath('/dashboard');
    return { success: true, message: `Área ${isActive ? 'ativada' : 'desativada'} com sucesso!` };
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
    const concurrentRecords = cleaningRecords.filter(r => r.cleaningType === 'concurrent');
    const terminalRecords = cleaningRecords.filter(r => r.cleaningType === 'terminal');
    
    const concurrent = concurrentRecords.length;
    const terminal = terminalRecords.length;

    const totalConcurrentDuration = concurrentRecords.reduce((sum, r) => sum + r.actualDuration, 0);
    const totalTerminalDuration = terminalRecords.reduce((sum, r) => sum + r.actualDuration, 0);

    const avgConcurrentTime = concurrent > 0 ? Math.round(totalConcurrentDuration / concurrent) : 0;
    const avgTerminalTime = terminal > 0 ? Math.round(totalTerminalDuration / terminal) : 0;

    const delayed = cleaningRecords.filter(r => r.delayed).length;
    const onTime = total - delayed;
    const delayedConcurrent = concurrentRecords.filter(r => r.delayed).length;
    const delayedTerminal = terminalRecords.filter(r => r.delayed).length;


    return {
        success: true,
        report: {
            total,
            concurrent,
            terminal,
            avgConcurrentTime,
            avgTerminalTime,
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
        perfil: formData.get('perfil'),
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
  query: "SELECT code1, tipobloq FROM cable1",
  statusMappings: {
    available: 'L',
    occupied: '*'
  },
  fieldMappings: {
    codeField: 'code1',
    statusField: 'tipobloq',
  },
  transformation: {
    nameSeparator: " ",
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
  } catch (error: any) {
    return { isValid: false, message: 'Dados de configuração inválidos: ' + error.message };
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
  const syncId = `sync-${Date.now()}`;
  const startTime = Date.now();
  
  syncLogger.info('Iniciando sincronização manual', { syncId });

  try {
    const db = await dbConnect();
    const config = await getIntegrationConfig();
    
    if (!config.enabled) {
      syncLogger.warn('Tentativa de sync com integração desativada', { syncId });
      return {
        success: false,
        message: 'Integração não está ativada.',
        syncId
      };
    }

    const configErrors = validateTransformationConfig(config);
    if (configErrors.length > 0) {
       syncLogger.error('Configuração de sync inválida', { syncId, errors: configErrors });
      return {
        success: false,
        message: `Configuração incompleta: ${configErrors.join(', ')}`
      };
    }

    syncLogger.info('Buscando dados do sistema externo', { syncId });
    
    const { fetchExternalData } = await import('./external-db-connection');
    const externalData = await fetchExternalData(config);
    
    if (externalData.length === 0) {
      syncLogger.info('Nenhum dado encontrado no sistema externo', { syncId });
      return {
        success: true,
        message: 'Sincronização concluída. Nenhum dado encontrado no sistema externo.',
        stats: { total: 0, updated: 0, created: 0, skipped: 0, errors: 0 }
      };
    }

    syncLogger.info(`Transformando ${externalData.length} registros`, { syncId });
    const transformer = new DataTransformer(config);
    const transformationResult = await transformer.transform(externalData);
    
    syncLogger.info('Resultado da transformação', { syncId, stats: transformationResult.stats });
    if (transformationResult.errors.length > 0) {
      syncLogger.warn('Erros durante a transformação', { syncId, errors: transformationResult.errors });
    }

    const locationsCollection = db.collection('locations');
    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;

    for (const leito of transformationResult.data) {
      try {
        const existingLeito = await locationsCollection.findOne({
          externalCode: leito.externalCode,
        });

        if (existingLeito) {
           if (existingLeito.status === 'in_cleaning') {
             skippedCount++;
             continue;
           }

          const hasChanges = 
            existingLeito.status !== leito.status ||
            existingLeito.name !== leito.name ||
            existingLeito.number !== leito.number;

          if (hasChanges) {
            await locationsCollection.updateOne(
              { _id: existingLeito._id },
              { $set: { 
                  status: leito.status, 
                  name: leito.name, 
                  number: leito.number, 
                  updatedAt: new Date() 
                } 
              }
            );
            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          await locationsCollection.insertOne({
            name: leito.name,
            number: leito.number,
            status: leito.status,
            externalCode: leito.externalCode,
            locationType: 'leito',
            currentCleaning: null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          createdCount++;
        }
      } catch (error: any) {
        syncLogger.error('Erro ao processar leito no banco local', { syncId, leito, error: error.message });
        transformationResult.stats.errors++;
      }
    }

    const integrationCollection = db.collection('integration_config');
    const syncStats = {
      total: transformationResult.stats.total,
      updated: updatedCount,
      created: createdCount,
      skipped: skippedCount + transformationResult.stats.skipped,
      errors: transformationResult.stats.errors
    };

    await integrationCollection.updateOne(
      { _id: 'integration_settings' },
      { $set: { lastSync: new Date(), lastSyncStats: syncStats } }
    );
    
    const message = `Sincronização concluída! ${createdCount} novos, ${updatedCount} atualizados, ${syncStats.skipped} ignorados, ${syncStats.errors} erros.`;
    
    syncLogger.info('Sincronização concluída com sucesso', {
      syncId,
      stats: syncStats,
      duration: Date.now() - startTime
    });

    await saveSyncHistory({
      syncId,
      timestamp: new Date(),
      type: 'manual',
      success: true,
      stats: syncStats,
      duration: Date.now() - startTime,
      config: { host: config.host, database: config.database }
    });

    revalidatePath('/dashboard');

    return {
      success: transformationResult.stats.errors === 0,
      message,
      stats: syncStats,
      syncId
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    syncLogger.error('Erro na sincronização', { syncId, error: error.message, duration });
    
    await saveSyncHistory({
      syncId,
      timestamp: new Date(),
      type: 'manual',
      success: false,
      error: error.message,
      duration
    });

    return {
      success: false,
      message: `Erro na sincronização: ${error.message}`,
      stats: { total: 0, updated: 0, created: 0, skipped: 0, errors: 1 },
      syncId
    };
  }
}

async function saveSyncHistory(historyItem: any) {
  try {
    const db = await dbConnect();
    const collection = db.collection('sync_history');
    await collection.insertOne(historyItem);
  } catch (error: any) {
    syncLogger.error('Erro ao salvar histórico de sync:', { error: error.message });
  }
}

export async function getSyncStatistics() {
  try {
    const db = await dbConnect();
    const collection = db.collection('sync_history');
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stats = await collection.aggregate([
      { $match: { timestamp: { $gte: last24h } } },
      {
        $group: {
          _id: '$success',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          lastSync: { $max: '$timestamp' }
        }
      }
    ]).toArray();

    const successCount = stats.find(s => s._id === true)?.count || 0;
    const errorCount = stats.find(s => s._id === false)?.count || 0;
    const total = successCount + errorCount;
    const successRate = total > 0 ? (successCount / total) * 100 : 0;

    return {
      successRate,
      totalSyncs: total,
      successfulSyncs: successCount,
      failedSyncs: errorCount,
      lastSync: stats[0]?.lastSync || null
    };
  } catch (error: any) {
    syncLogger.error('Erro ao obter estatísticas de sync', { error: error.message });
    return null;
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

export async function testTransformation() {
  try {
    const config = await getIntegrationConfig();
    const result = await generateSampleTransformation(config);
    
    return {
      success: true,
      sampleInput: [
        { [config.fieldMappings.codeField]: "QTO101", [config.fieldMappings.statusField]: config.statusMappings.available },
        { [config.fieldMappings.codeField]: "APTO202", [config.fieldMappings.statusField]: config.statusMappings.occupied },
      ],
      sampleOutput: result.data,
      config: {
        fieldMappings: config.fieldMappings,
        statusMappings: config.statusMappings,
        transformation: config.transformation
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}


// --- Scheduled Requests ---

export async function getPendingRequests(): Promise<ScheduledRequest[]> {
    const db = await dbConnect();
    const requests = await db.collection('scheduled_requests')
        .find({ status: 'agendada' })
        .sort({ requestedAt: 1 })
        .toArray();
    return convertToPlainObject(requests);
}

export async function acceptRequest(requestId: string) {
    const session = await getSession();
    if (!session?.user) {
        return { success: false, error: "Usuário não autenticado." };
    }
    const { user } = session;

    const db = await dbConnect();
    const request = await db.collection('scheduled_requests').findOne({ 
        _id: new ObjectId(requestId),
        status: 'agendada' 
    });

    if (!request) {
        return { success: false, error: 'Solicitação não encontrada ou já atendida.' };
    }
    
    const location = await getLocationById(request.locationId);
    if (!location) {
        return { success: false, error: 'Local da solicitação não encontrado.' };
    }

    // Start cleaning using the new flow
    const formData = new FormData();
    formData.append('locationId', request.locationId);
    formData.append('type', request.cleaningType);

    const startCleaningResult = await startCleaning(null, formData);

    if (!startCleaningResult.success) {
        return { success: false, error: startCleaningResult.error || "Falha ao iniciar a higienização." };
    }
    
    // Update the scheduled request
    const timeToAssign = Math.round((new Date().getTime() - new Date(request.requestedAt).getTime()) / 60000); // in minutes
    await db.collection('scheduled_requests').updateOne(
        { _id: new ObjectId(requestId) },
        {
            $set: {
                status: 'em_andamento',
                assignedTo: { userId: user._id, userName: user.name },
                assignedAt: new Date(),
                startedAt: new Date(),
                timeToAssign: timeToAssign,
                updatedAt: new Date()
            }
        }
    );

    revalidatePath('/dashboard');
    return { success: true, message: 'Solicitação aceita! Higienização iniciada.' };
}
