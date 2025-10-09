
'use server';

import { revalidatePath } from 'next/cache';
import { dbConnect } from './db';
import { CreateAsgSchema, StartCleaningFormSchema, UpdateAsgSchema, UpdateCleaningSettingsSchema, ReportFiltersSchema, type CleaningRecord, LoginSchema, CreateUserSchema, UpdateUserSchema, IntegrationConfigSchema, type IntegrationConfig, CreateAreaSchema, UpdateAreaSchema, LocationSchema, type Location, CreateLocationMappingSchema, UpdateLocationMappingSchema } from './schemas';
import type { CleaningType } from './schemas';
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


// --- Location Actions ---

export async function getLocations(): Promise<Location[]> {
  const db = await dbConnect();
  
  const leitos = await db.collection('locations').find().sort({ name: 1, number: 1 }).toArray();
  const areas = await db.collection('areas').find({isActive: true}).sort({ setor: 1 }).toArray();
  const mappings = await db.collection('location_mappings').find({ isActive: true }).toArray();

  const mappingsByExternalCode = mappings.reduce((acc, m) => {
    acc[m.externalCode] = m;
    return acc;
  }, {} as Record<string, any>);

  const combinedLocations: Location[] = [];

  leitos.forEach(leito => {
    const mapping = mappingsByExternalCode[leito.externalCode];
    combinedLocations.push({
      _id: leito._id,
      name: mapping ? mapping.internalName : leito.name,
      number: mapping ? mapping.internalNumber : leito.number,
      status: leito.status,
      currentCleaning: leito.currentCleaning,
      externalCode: leito.externalCode,
      locationType: 'leito',
      setor: mapping ? mapping.setor : 'Sem Setor',
      createdAt: leito.createdAt,
      updatedAt: leito.updatedAt,
    });
  });

  areas.forEach(area => {
    combinedLocations.push({
      _id: area._id,
      name: area.setor,
      number: area.shortCode,
      // @ts-ignore - status pode não existir em 'areas' ainda
      status: area.status || 'available',
      // @ts-ignore
      currentCleaning: area.currentCleaning || null,
      externalCode: area.locationId,
      locationType: 'area',
      setor: area.setor, // O setor da área é ele mesmo
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
    if (a.number < b.number) return -1;
    if (a.number > b.number) return 1;
    return 0;
  });

  return convertToPlainObject(combinedLocations);
}

export async function getLocationByCode(code: string) {
    console.log('🔍🔍🔍 DEBUG COMPLETO DA BUSCA 🔍🔍🔍');
    console.log('🔍 Código procurado:', code);
    
    try {
        const db = await dbConnect();
        
        // Prioridade 1: Buscar em `location_mappings` pelo locationId
        const mapping = await db.collection('location_mappings').findOne({ locationId: code, isActive: true });
        if (mapping) {
            console.log('✅ Mapeamento encontrado:', mapping);
             const locationFromMapping = {
                _id: mapping._id, // Usar o _id do próprio mapeamento
                name: mapping.internalName,
                number: mapping.internalNumber,
                status: 'available', // O status real virá da collection 'locations'
                currentCleaning: null,
                externalCode: mapping.externalCode,
                locationType: mapping.type,
                setor: mapping.setor,
                createdAt: mapping.createdAt,
                updatedAt: mapping.updatedAt,
            };

            // Agora, busca o status atual na collection 'locations'
            if (mapping.type === 'leito') {
                const liveLocation = await db.collection('locations').findOne({ externalCode: mapping.externalCode });
                if (liveLocation) {
                  locationFromMapping.status = liveLocation.status;
                  locationFromMapping.currentCleaning = liveLocation.currentCleaning;
                }
            } else { // type é 'area'
                 const liveArea = await db.collection('areas').findOne({ locationId: mapping.locationId });
                 if (liveArea) {
                    // @ts-ignore
                    locationFromMapping.status = liveArea.status || 'available';
                    // @ts-ignore
                    locationFromMapping.currentCleaning = liveArea.currentCleaning || null;
                 }
            }


            return convertToPlainObject(locationFromMapping);
        }
        console.log('... Nenhum mapeamento encontrado.');


        const areasCollection = db.collection('areas');
        const locationsCollection = db.collection('locations');

        // 2. Tenta encontrar em 'areas'
        console.log('2. Buscando na coleção "areas"...');
        const area = await areasCollection.findOne({ locationId: code, isActive: true });

        if (area) {
            console.log('✅ Área encontrada:', area);
            // Transforma o objeto 'area' para se parecer com 'Location'
            const locationFromArea = {
                _id: area._id,
                name: area.setor,
                number: area.shortCode,
                status: area.status || 'available',
                currentCleaning: area.currentCleaning || null,
                externalCode: area.locationId,
                locationType: 'area',
                setor: area.setor,
                createdAt: area.createdAt,
                updatedAt: area.updatedAt,
            };
            return convertToPlainObject(locationFromArea);
        }
        console.log('... Nenhuma área ativa encontrada com esse código.');

        // 3. Se não encontrou, tenta em 'locations'
        console.log('3. Buscando na coleção "locations"...');
        const location = await locationsCollection.findOne({ externalCode: code });

        if (location) {
            console.log('✅ Leito encontrado:', location);
             const locationFromLeito = {
                ...location,
                locationType: 'leito',
            };
            return convertToPlainObject(locationFromLeito);
        }
        console.log('... Nenhum leito encontrado com esse código.');

        // 4. Se não encontrou em nenhum lugar
        console.log('❌ Código não encontrado em nenhuma coleção.');
        return null;

    } catch (error) {
        console.error('💥 ERRO FATAL em getLocationByCode:', error);
        return null;
    }
}


export async function startCleaning(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Usuário não autenticado. Por favor, faça login novamente." };
  }

  const locationId = formData.get('locationId') as string;
  const type = formData.get('type') as CleaningType;

  console.log('=== DEBUG START CLEANING ===');
  console.log('locationId recebido:', locationId);
  console.log('Tipo de Higienização:', type);

  // Validações básicas de entrada
  if (!locationId) {
    return { success: false, error: 'ID do local não fornecido.' };
  }
  if (!type || (type !== 'concurrent' && type !== 'terminal')) {
    return { success: false, error: 'Tipo de higienização inválido.' };
  }

  try {
    const db = await dbConnect();
    const locationsCollection = db.collection('locations');
    const areasCollection = db.collection('areas');

    let location: any = null;
    let collectionToUpdate: any = null;

    // 1. Tenta buscar por ObjectId válido nas coleções
    if (ObjectId.isValid(locationId)) {
        console.log('🔍 Tentando buscar por ObjectId...');
        const objectId = new ObjectId(locationId);
        
        location = await locationsCollection.findOne({ _id: objectId });
        if (location) {
            collectionToUpdate = locationsCollection;
        } else {
            location = await areasCollection.findOne({ _id: objectId });
            if (location) {
                collectionToUpdate = areasCollection;
            }
        }
        console.log('📦 Resultado da busca por ObjectId:', location ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    }

    // 2. Se não encontrou, tenta buscar por campos de código (string)
    if (!location) {
        console.log('🔍 Tentando buscar por códigos de string...');
        location = await locationsCollection.findOne({ externalCode: locationId });
        if (location) {
            collectionToUpdate = locationsCollection;
        } else {
            location = await areasCollection.findOne({ locationId: locationId });
            if (location) {
                collectionToUpdate = areasCollection;
            }
        }
        console.log('📦 Resultado da busca por string:', location ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    }

    if (!location) {
      console.log(`❌ Local não encontrado com ID/código: ${locationId}`);
      return { success: false, error: 'Local não encontrado no banco de dados.' };
    }

    console.log('✅ Local encontrado:', location);

    if (location.status === 'in_cleaning') {
      return { success: false, error: 'Este local já está em higienização.' };
    }

    const updateResult = await collectionToUpdate.updateOne({ _id: location._id }, {
      $set: {
          status: 'in_cleaning',
          currentCleaning: {
              type,
              userId: new ObjectId(session.user._id),
              userName: session.user.name,
              startTime: new Date(),
          },
          updatedAt: new Date()
      }
    });

    console.log('🔄 Resultado da atualização:', updateResult);
    if(updateResult.matchedCount === 0) {
        return { success: false, error: 'Falha ao atualizar o status do local. Nenhum documento correspondente encontrado.' };
    }


    revalidatePath('/dashboard');
    return { success: true, message: `Higienização ${type} iniciada com sucesso!` };

  } catch (error) {
    console.error('❌ Erro crítico ao iniciar limpeza:', error);
    return {
      success: false,
      error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : 'Unknown error')
    };
  }
}

export async function finishCleaning(locationId: string) {
  const db = await dbConnect();
  
  let location: Location | null = null;
  let collectionToUpdateName: 'locations' | 'areas' | null = null;

  const objectId = new ObjectId(locationId);

  // @ts-ignore
  location = await db.collection('locations').findOne({ _id: objectId });
  if (location) {
    collectionToUpdateName = 'locations';
  } else {
    // @ts-ignore
    location = await db.collection('areas').findOne({ _id: objectId });
    if(location) {
      collectionToUpdateName = 'areas';
    }
  }

  if (!location || !location.currentCleaning || !collectionToUpdateName) {
    return { error: 'Higienização não encontrada para este local.' };
  }
  
  const collectionToUpdate = db.collection(collectionToUpdateName);

  const { userId, userName, type, startTime } = location.currentCleaning;
  
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
      userName: userName,
      delayInMinutes: delayInMinutes,
      occurredAt: finishTime,
    });
  }

  const record: Omit<CleaningRecord, '_id'> = {
    locationId: location._id.toString(),
    locationName: `${location.name} - ${location.number}`,
    locationType: location.locationType,
    cleaningType: type,
    userId: new ObjectId(userId),
    userName: userName,
    startTime: startTime,
    finishTime: finishTime,
    expectedDuration: expectedDuration,
    actualDuration: actualDuration,
    status: 'completed',
    delayed: isDelayed,
    date: finishTime,
  };
  await db.collection('cleaning_records').insertOne(record);


  // ✅ CORREÇÃO: O status final deve ser sempre 'available'
  const newStatus = 'available';

  await collectionToUpdate.updateOne({ _id: objectId }, {
    $set: {
        status: newStatus,
        currentCleaning: null,
        updatedAt: new Date()
    },
  });

  revalidatePath('/dashboard');
  return { success: true, message: 'Higienização finalizada com sucesso!' };
}

// --- Location Mapping Actions ---
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
