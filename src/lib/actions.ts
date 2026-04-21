
'use server';

import { revalidatePath } from 'next/cache';
import { dbConnect } from './db';
import { CreateAsgSchema, StartCleaningFormSchema, UpdateAsgSchema, UpdateCleaningSettingsSchema, ReportFiltersSchema, type CleaningRecord, LoginSchema, CreateUserSchema, UpdateUserSchema, IntegrationConfigSchema, type IntegrationConfig, CreateAreaSchema, UpdateAreaSchema, LocationSchema, type Location, CreateLocationMappingSchema, UpdateLocationMappingSchema, ScheduledRequest, ScheduledRequestSchema, ActiveCleaningSchema, type ActiveCleaning, type UserProfile, type CleaningType, CreateNonConformitySchema, type NonConformity, type CleaningOccurrence, User, AuditRecord, AuditRecordSchema, type LocationStatus, WebhookSettingsSchema, type WebhookSettings } from './schemas';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME, encrypt, getSession } from './session';
import { convertToPlainObject } from './utils';
import { DataTransformer, generateSampleTransformation } from './advanced-transformation';

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

// --- Webhook Private Helper ---
async function sendWebhookNotification(
  event: keyof WebhookSettings['enabledEvents'],
  context: {
    local: string;
    tipo_limpeza?: string;
    prioridade?: string;
    // checklist-specific
    auditorName?: string;
    locationCode?: string;
    setor?: string;
    aptidao?: string;
    // override the template entirely
    fixedMessage?: string;
  }
) {
  try {
    const settings = await getWebhookSettings();
    if (!settings.url || !(settings.enabledEvents as any)[event]) return;

    let message: string;
    if (context.fixedMessage) {
      message = context.fixedMessage;
    } else {
      message = settings.template;
      message = message.replace('{local}', context.local);
      message = message.replace('{tipo_limpeza}', context.tipo_limpeza || 'N/A');
      message = message.replace('{prioridade}', context.prioridade || 'Normal');
      message = message.replace('{horario}', new Date().toLocaleTimeString('pt-BR'));
    }

    await fetch(settings.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  } catch (error) {
    console.error(`Falha ao enviar notificação webhook para o evento ${event}:`, error);
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
  const normalizedLogin = login.trim().toLowerCase();
  const db = await dbConnect();

  const user = await db.collection('users').findOne({ login: normalizedLogin, password: password, active: true });

  if (!user) {
    await logAction('login_failed', { login: normalizedLogin, reason: 'Invalid credentials or inactive user.' });
    return { error: 'Credenciais inválidas ou usuário inativo.' };
  }

  if (user.login === 'admin' && user.perfil !== 'admin') {
    await db.collection('users').updateOne({ _id: user._id }, { $set: { perfil: 'admin' } });
    user.perfil = 'admin';
  }

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  const session = await encrypt({ user: { _id: user._id.toString(), name: user.name, login: user.login, perfil: user.perfil || 'usuario' }, expires });

  cookies().set(SESSION_COOKIE_NAME, session, { expires, httpOnly: true });

  await logAction('login_success', { login: normalizedLogin });
  redirect('/dashboard');
}

export async function logout() {
  const session = await getSession();
  await logAction('logout', { login: session?.user?.login });
  cookies().set(SESSION_COOKIE_NAME, '', { expires: new Date(0) });
  redirect('/login');
}

// --- Status Normalization Helper ---
const normalizeStatus = (status: string): LocationStatus => {
  const s = (status || '').trim().toUpperCase();
  if (s === 'AVAILABLE' || s === 'L' || s === 'DISPONÍVEL' || s === 'DISPONIVEL') return 'available';
  if (s === 'OCCUPIED' || s === '*' || s === '•' || s === 'OCUPADO') return 'occupied';
  if (s === 'IN_CLEANING' || s === 'LIMPANDO') return 'in_cleaning';
  return 'available';
};

// --- Location and Active Cleaning Actions ---

export async function getActiveCleanings(): Promise<ActiveCleaning[]> {
  try {
    const db = await dbConnect();
    const activeCleanings = await db.collection('active_cleanings').find().toArray();
    return convertToPlainObject(activeCleanings) || [];
  } catch (error) {
    console.error("Error in getActiveCleanings:", error);
    return [];
  }
}

const getLocationById = async (id: string): Promise<Location | null> => {
  try {
    if (!ObjectId.isValid(id)) {
        return null;
    }
    const db = await dbConnect();
    const objectId = new ObjectId(id);

    let item = await db.collection('locations').findOne({ _id: objectId }) || await db.collection('areas').findOne({ _id: objectId });

    if (!item) return null;

    const isArea = !!item.setor; 
    const location: Location = {
        _id: item._id,
        name: isArea ? item.setor : item.name,
        number: isArea ? (item.shortCode || item.locationId || '') : (item.number || ''),
        status: normalizeStatus(item.status),
        currentCleaning: item.currentCleaning || null,
        externalCode: isArea ? item.locationId : item.externalCode,
        locationType: isArea ? 'area' : 'leito',
        setor: isArea ? item.setor : (item.setor || 'Sem Setor'),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };

    return convertToPlainObject(location);
  } catch (error) {
    console.error("Error in getLocationById:", error);
    return null;
  }
};

export async function getLocations(): Promise<Location[]> {
  try {
    const db = await dbConnect();

    const [leitos, areas, mappings, activeCleanings, scheduledRequests] = await Promise.all([
        db.collection('locations').find({ active: { $ne: false } }).sort({ name: 1, number: 1 }).toArray(),
        db.collection('areas').find({isActive: true}).sort({ setor: 1 }).toArray(),
        db.collection('location_mappings').find({ isActive: true }).toArray(),
        db.collection('active_cleanings').find().toArray(),
        db.collection('scheduled_requests').find({ status: 'agendada' }).toArray()
    ]);

    const mappingsByExternalCode = (mappings || []).reduce((acc, m) => {
      acc[m.externalCode] = m;
      return acc;
    }, {} as Record<string, any>);

    const activeCleaningsByLocationId = (activeCleanings || []).reduce((acc, ac) => {
      acc[ac.locationId] = ac;
      return acc;
    }, {} as Record<string, ActiveCleaning>);

    const pendingRequestIds = new Set((scheduledRequests || []).map(sr => sr.locationId));

    const combinedLocations: Location[] = [];

    (leitos || []).forEach(leito => {
      const mapping = mappingsByExternalCode[leito.externalCode];
      const activeCleaning = activeCleaningsByLocationId[leito._id.toString()];
      let status = activeCleaning ? 'in_cleaning' : normalizeStatus(leito.status);

      combinedLocations.push({
        _id: leito._id,
        name: mapping ? mapping.internalName : leito.name,
        number: mapping ? mapping.internalNumber : leito.number,
        status: status as any,
        currentCleaning: activeCleaning ? {
            type: activeCleaning.cleaningType,
            userId: activeCleaning.userId,
            userName: activeCleaning.userName,
            startTime: activeCleaning.startTime
        } : null,
        externalCode: leito.externalCode,
        locationType: 'leito',
        setor: mapping ? mapping.setor : (leito.setor || 'Sem Setor'),
        createdAt: leito.createdAt,
        updatedAt: leito.updatedAt,
        isRequested: pendingRequestIds.has(leito._id.toString())
      } as any);
    });

    (areas || []).forEach(area => {
      const activeCleaning = activeCleaningsByLocationId[area._id.toString()];
      const status = activeCleaning ? 'in_cleaning' : normalizeStatus(area.status || 'available');
      
      combinedLocations.push({
        _id: area._id,
        name: area.setor,
        number: area.shortCode,
        status: status as any,
        currentCleaning: activeCleaning ? {
            type: activeCleaning.cleaningType,
            userId: activeCleaning.userId,
            userName: area.userName || 'Auditor',
            startTime: activeCleaning.startTime
        } : null,
        externalCode: area.locationId,
        locationType: 'area',
        setor: area.setor,
        createdAt: area.createdAt,
        updatedAt: area.updatedAt,
        isRequested: pendingRequestIds.has(area._id.toString())
      } as any);
    });

    combinedLocations.sort((a, b) => {
      if (a.setor < b.setor) return -1;
      if (a.setor > b.setor) return 1;
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      const numA = parseInt(a.number, 10) || a.number;
      const numB = parseInt(b.number, 10) || b.number;
      if (numA < numB) return -1;
      if (numB < numA) return 1;
      return 0;
    });

    return convertToPlainObject(combinedLocations) || [];
  } catch (error) {
    console.error("Error in getLocations:", error);
    return [];
  }
}

export async function getLocationByCode(code: string) {
  try {
    const db = await dbConnect();
    
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
             let originalItem;
             if(locationData.locationType === 'leito') {
                 originalItem = await db.collection('locations').findOne({_id: new ObjectId(locationData._id)})
             } else {
                 originalItem = await db.collection('areas').findOne({_id: new ObjectId(locationData._id)})
             }
             if(originalItem) locationData.status = normalizeStatus(originalItem.status);
        }
        return convertToPlainObject(locationData);
    }
    
    let item: any = await db.collection('areas').findOne({ locationId: code, isActive: true }) || await db.collection('locations').findOne({ externalCode: code, active: { $ne: false } });
    if (!item) return null;

    const isArea = !!item.setor; 
    const locationId = item._id.toString();
    const activeCleaning = await db.collection('active_cleanings').findOne({ locationId: locationId });
    
    const status = activeCleaning ? 'in_cleaning' : normalizeStatus(item.status);
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
  } catch (error) {
    console.error("Error in getLocationByCode:", error);
    return null;
  }
}


export async function startCleaning(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Usuário não autenticado." };
  }

  const { user } = session;
  const userProfile = user.perfil as UserProfile;
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

  const existingActive = await db.collection('active_cleanings').findOne({ locationId: location._id.toString() });
  if (existingActive) {
      return { success: false, error: 'Este local já está em higienização.' };
  }
  const existingScheduled = await db.collection('scheduled_requests').findOne({ locationId: location._id.toString(), status: 'agendada' });
  if (existingScheduled) {
      return { success: false, error: 'Já existe uma solicitação de higienização para este local.' };
  }
  
  const cleaningSettings = await getCleaningSettings();
  const expectedDuration = cleaningSettings[type];
  
  const buildLocationName = (loc: Location) =>
    loc.locationType === 'area'
      ? (loc.setor || loc.name)
      : loc.externalCode && loc.setor
        ? `${loc.externalCode} — ${loc.setor}`
        : loc.number ? `${loc.name} - ${loc.number}` : loc.name;

  if (userProfile === 'admin' || userProfile === 'gestor') {
     const newScheduledRequest = {
      locationId: location._id.toString(),
      locationName: buildLocationName(location),
      locationType: location.locationType,
      cleaningType: type,
      requestedBy: {
        userId: user._id.toString(),
        userName: user.name,
        userProfile: user.perfil,
      },
      requestedAt: new Date(),
      expectedDuration: expectedDuration,
      status: 'agendada',
      priority: 'normal',
      assignedTo: null,
      assignedAt: null,
      startedAt: null,
      completedAt: null,
      timeToAssign: null,
      timeToComplete: null,
      assignedDuration: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('scheduled_requests').insertOne(newScheduledRequest);
    
    // Webhook: Nova Solicitação
    await sendWebhookNotification('newRequest', {
      local: buildLocationName(location),
      tipo_limpeza: type === 'terminal' ? 'Terminal' : 'Concorrente'
    });

    revalidatePath('/dashboard');
    return { success: true, message: `Solicitação de higienização para ${buildLocationName(location)} criada com sucesso!` };
  }

  if (userProfile === 'usuario' || userProfile === 'auditor') {
    const newActiveCleaning: Omit<ActiveCleaning, '_id'> = {
      locationId: location._id.toString(),
      locationName: buildLocationName(location),
      locationType: location.locationType,
      cleaningType: type,
      userId: new ObjectId(user._id),
      userName: user.name,
      startTime: new Date(),
      status: 'in_progress',
      expectedDuration: expectedDuration
    };

    await db.collection('active_cleanings').insertOne(newActiveCleaning);

    const collectionName = location.locationType === 'leito' ? 'locations' : 'areas';
    await db.collection(collectionName).updateOne({_id: new ObjectId(location._id)}, {$set: { status: 'in_cleaning', updatedAt: new Date() }});
    
    revalidatePath('/dashboard');
    const msg = userProfile === 'auditor' ? 'Auditoria iniciada!' : `Higienização iniciada com sucesso em ${buildLocationName(location)}!`;
    return { success: true, message: msg };
  }
  
  return { success: false, error: 'Perfil de usuário desconhecido ou não autorizado para esta ação.' };
}


export async function finishCleaning(locationId: string, isAudit: boolean = false) {
  try {
    const db = await dbConnect();
    
    let activeCleaning: any = null;
    let sourceType: 'active_cleanings' | 'scheduled_requests' | null = null;
    
    activeCleaning = await db.collection('active_cleanings').findOne({ locationId: locationId.toString() });
    if (activeCleaning) {
        sourceType = 'active_cleanings';
    } 
    else {
        activeCleaning = await db.collection('scheduled_requests').findOne({ 
            locationId: locationId.toString(),
            status: 'em_andamento'
        });
        if (activeCleaning) {
            sourceType = 'scheduled_requests';
        }
    }

    if (!activeCleaning || !sourceType) {
      return { error: 'Higienização ativa não encontrada para este local.' };
    }

    const finishTime = new Date();
    const startTime = new Date(activeCleaning.startTime || activeCleaning.startedAt); 
    const actualDuration = Math.round((finishTime.getTime() - startTime.getTime()) / (1000 * 60));
    const isDelayed = actualDuration > activeCleaning.expectedDuration;

    if (isDelayed) {
      await db.collection('cleaning_occurrences').insertOne({
        locationName: activeCleaning.locationName,
        cleaningType: activeCleaning.cleaningType,
        userName: activeCleaning.userName || activeCleaning.assignedTo.userName,
        delayInMinutes: actualDuration - activeCleaning.expectedDuration,
        occurredAt: finishTime,
      });
    }

    const record: Omit<CleaningRecord, '_id'> = {
      locationId: activeCleaning.locationId,
      locationName: activeCleaning.locationName,
      locationType: activeCleaning.locationType as 'leito' | 'area',
      cleaningType: activeCleaning.cleaningType as CleaningType,
      userId: new ObjectId(activeCleaning.userId || activeCleaning.assignedTo.userId),
      userName: activeCleaning.userName || activeCleaning.assignedTo.userName,
      startTime: startTime,
      finishTime: finishTime,
      expectedDuration: activeCleaning.expectedDuration,
      actualDuration: actualDuration,
      status: 'completed',
      delayed: isDelayed,
      date: finishTime,
    };
    await db.collection('cleaning_records').insertOne(record);

    if (sourceType === 'active_cleanings') {
      await db.collection('active_cleanings').deleteOne({ _id: activeCleaning._id });
    } else if (sourceType === 'scheduled_requests') {
       await db.collection('scheduled_requests').updateOne(
          { _id: activeCleaning._id },
          { $set: { status: 'concluida', completedAt: finishTime, timeToComplete: actualDuration, updatedAt: new Date() } }
      );
    }
    
    const collectionName = activeCleaning.locationType === 'leito' ? 'locations' : 'areas';
    await db.collection(collectionName).updateOne(
        { _id: new ObjectId(locationId) }, 
        { $set: { status: 'available', currentCleaning: null, updatedAt: new Date() }}
    );

    // Webhook: Finalização de Higienização (apenas se não for audit)
    if (!isAudit) {
      await sendWebhookNotification('cleaningFinished', { 
        local: activeCleaning.locationName, 
        tipo_limpeza: activeCleaning.cleaningType === 'terminal' ? 'Terminal' : 'Concorrente' 
      });
    }

    revalidatePath('/dashboard');
    return { success: true, message: 'Higienização finalizada com sucesso!' };
  } catch (error: any) {
    console.error("Error in finishCleaning:", error);
    return { error: 'Erro ao finalizar: ' + error.message };
  }
}

// --- Audit Actions ---

export async function createAuditRecord(data: {
    locationId: string;
    locationName: string;
    locationCode?: string;
    setor?: string;
    lastCleaningId: string | null;
    checklistData: Record<string, "conforme" | "não_conforme" | "n/a">;
    observations?: string;
}) {
    const session = await getSession();
    if (!session?.user || session.user.perfil !== 'auditor') {
        return { success: false, error: "Acesso negado. Apenas auditores podem realizar esta ação." };
    }

    try {
        const db = await dbConnect();
        
        const newRecord: Omit<AuditRecord, '_id'> = {
            locationId: data.locationId,
            locationName: data.locationName,
            auditorId: new ObjectId(session.user._id),
            auditorName: session.user.name,
            lastCleaningId: data.lastCleaningId,
            checklistData: data.checklistData,
            observations: data.observations,
            timestamp: new Date(),
        };

        const validation = AuditRecordSchema.safeParse({ ...newRecord, _id: new ObjectId() });
        if (!validation.success) {
            console.error("Erro de validação no schema de auditoria:", validation.error.flatten());
            return { success: false, error: "Dados da auditoria inconsistentes. Verifique o preenchimento." };
        }

        const aptidao = data.checklistData['conclusao'] === 'conforme' ? 'apto' : 'nao_apto';
        await db.collection('audit_records').insertOne({ ...newRecord, aptidao });
        // Remove rascunho após gravação definitiva
        await db.collection('audit_drafts').deleteOne({ locationId: data.locationId, auditorId: session.user._id });

        const finishResult = await finishCleaning(data.locationId, true);
        
        if (finishResult.success) {
            await logAction('audit_completed', { locationId: data.locationId, locationName: data.locationName });
            
            // Webhook: Finalização de Auditoria (genérico)
            await sendWebhookNotification('auditFinished', { local: data.locationName });

            // Webhook: Conclusão de Checklist (mensagem estruturada)
            const aptidaoLabel = aptidao === 'apto' ? 'APTO' : 'NÃO APTO';
            const setorLabel   = data.setor || 'Setor não informado';
            const codeLabel    = data.locationCode || data.locationName;
            await sendWebhookNotification('checklistFinished', {
              local: data.locationName,
              fixedMessage: `${session.user.name} finalizou o checklist do leito ${codeLabel} — ${setorLabel}. Status: ${aptidaoLabel} para ocupação.`,
            });

            return { success: true, message: "Auditoria finalizada e gravada com sucesso!" };
        } else {
            console.error("Auditoria gravada mas falhou ao finalizar limpeza:", finishResult.error);
            return { success: false, error: "Conferência salva, mas erro ao atualizar status do local: " + finishResult.error };
        }
    } catch (error: any) {
        console.error('Erro fatal ao gravar auditoria:', error);
        return { success: false, error: "Erro crítico de banco de dados: " + (error.message || "Tente novamente mais tarde.") };
    }
}

// --- Audit Draft Actions ---

export async function saveAuditDraft(locationId: string, checklistData: Record<string, string>) {
  const session = await getSession();
  if (!session?.user) return;
  try {
    const db = await dbConnect();
    await db.collection('audit_drafts').updateOne(
      { locationId, auditorId: session.user._id },
      { $set: { checklistData, auditorId: session.user._id, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    console.error('Error saving audit draft:', err);
  }
}

export async function getAuditDraft(locationId: string): Promise<Record<string, string> | null> {
  const session = await getSession();
  if (!session?.user) return null;
  try {
    const db = await dbConnect();
    const draft = await db.collection('audit_drafts').findOne({
      locationId,
      auditorId: session.user._id,
    });
    return draft ? (draft.checklistData as Record<string, string>) : null;
  } catch {
    return null;
  }
}

// --- INTEGRATION ACTIONS ---

export async function getIntegrationConfig(): Promise<IntegrationConfig> {
  try {
    const db = await dbConnect();
    const config = await db.collection('integration_settings').findOne({ _id: 'default' });
    if (config) {
      return convertToPlainObject(config);
    }
  } catch (error) {
    console.error("Error in getIntegrationConfig:", error);
  }
  return {
    _id: 'default',
    enabled: false,
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    syncInterval: 5,
    query: 'SELECT code1, tipobloq FROM cable1',
    statusMappings: { available: 'L', occupied: '*' },
    fieldMappings: { codeField: 'code1', statusField: 'tipobloq' },
    transformation: { nameSeparator: ' ', customTransform: false },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function saveIntegrationConfig(config: IntegrationConfig) {
  const db = await dbConnect();
  const { _id, ...data } = config;
  await db.collection('integration_settings').updateOne(
    { _id: 'default' },
    { $set: { ...data, updatedAt: new Date() } },
    { upsert: true }
  );
  revalidatePath('/dashboard');
  return { success: true, message: 'Configurações de integração salvas com sucesso!' };
}

export async function testIntegrationConnection(config: IntegrationConfig) {
  const { testExternalConnection } = await import('./external-db-connection');
  return await testExternalConnection(config);
}

function resolveSetorByExternalCode(externalCode: string): string {
  const code = externalCode.trim().toUpperCase();

  // Sala de Estabilização - Oncologia
  if (code === 'LTE-01' || code === 'LTE-02') {
    return 'Sala de Estabilização - Oncologia';
  }

  // UTI: UTI-01 até UTI-10
  const utiMatch = code.match(/^UTI-(\d+)$/);
  if (utiMatch && parseInt(utiMatch[1], 10) >= 1 && parseInt(utiMatch[1], 10) <= 10) {
    return 'UTI';
  }

  // Pronto Atendimento / Hospital Dia: LT-01 a LT-05 (sem sufixo de letra)
  if (['LT-01', 'LT-02', 'LT-03', 'LT-04', 'LT-05'].includes(code)) {
    return 'Pronto Atendimento / Hospital Dia';
  }

  // Ala de Internação 1 - Cuidados Paliativos Onc (lista explícita)
  const ala1 = new Set([
    'LT-01A', 'LT-02B',
    'LT-03A', 'LT-03B',
    'LT-04A', 'LT-04B', 'LT-04C',
    'LT-05A', 'LT-05B', 'LT-05C',
    'LT-06B',
  ]);
  if (ala1.has(code)) return 'Ala de Internação 1 - Cuidados Paliativos Onc';

  // LT-XX[letra] — extrair número para Alas 3 e 4
  const ltMatch = code.match(/^LT-(\d+)[A-Z]$/);
  if (ltMatch) {
    const num = parseInt(ltMatch[1], 10);
    if (num >= 7 && num <= 23) return 'Ala de Internação 3 - Clínica Médica';
    if (num >= 24 && num <= 38) return 'Ala de Internação 4 - Clínica Cirúrgica';
  }

  return '';
}

export async function runManualSync() {
  const config = await getIntegrationConfig();
  if (!config.enabled) return { success: false, message: 'Integração desativada.' };

  const { fetchExternalData } = await import('./external-db-connection');
  try {
    const externalData = await fetchExternalData(config);
    const transformer = new DataTransformer(config);
    const result = await transformer.transform(externalData);

    const db = await dbConnect();
    let updatedCount = 0;
    let createdCount = 0;

    for (const item of result.data) {
      const setor = resolveSetorByExternalCode(item.externalCode);

      // Atualiza locations — inclui setor e garante active: true para leitos em uso
      const updateResult = await db.collection('locations').updateOne(
        { externalCode: item.externalCode },
        { $set: { status: item.status, setor, active: true, updatedAt: new Date() } }
      );

      if (updateResult.modifiedCount > 0) {
        updatedCount++;
      } else if (updateResult.matchedCount === 0) {
        // Leito não existe no MongoDB — criar automaticamente
        await db.collection('locations').insertOne({
          externalCode: item.externalCode,
          name: item.externalCode,
          number: item.number,
          status: item.status,
          locationType: 'leito',
          setor,
          active: true,
          currentCleaning: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        createdCount++;
        console.log(`[SYNC] Leito criado: "${item.externalCode}" setor="${setor || '(sem setor)'}" status="${item.status}"`);
      }

      // getLocations() prefere location_mappings.setor — corrigir se estiver vazio ou 'Sem Setor'
      if (setor) {
        await db.collection('location_mappings').updateOne(
          { externalCode: item.externalCode, setor: { $in: [null, '', 'Sem Setor'] } },
          { $set: { setor, updatedAt: new Date() } }
        );
      }
    }

    // Leitos com tipobloq = 'D' — desativar retroativamente no MongoDB
    let deactivatedCount = 0;
    for (const code of result.deactivated) {
      const deactivateResult = await db.collection('locations').updateOne(
        { externalCode: code },
        { $set: { active: false, updatedAt: new Date() } }
      );
      if (deactivateResult.modifiedCount > 0) {
        deactivatedCount++;
        console.log(`[SYNC] Leito desativado (tipobloq=D): "${code}"`);
      }
    }

    await db.collection('integration_settings').updateOne(
      { _id: 'default' },
      { $set: { lastSync: new Date(), lastSyncStats: { ...result.stats, updated: updatedCount, created: createdCount, deactivated: deactivatedCount } } }
    );

    // revalidatePath não funciona em jobs de background (node-cron) por falta de store de geração estática.
    // A atualização do dashboard ocorrerá no próximo carregamento do usuário ou via polling do cliente.
    return { success: true, message: 'Sincronização concluída.', stats: { ...result.stats, updated: updatedCount, created: createdCount, deactivated: deactivatedCount } };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getSyncStatus() {
  try {
    const config = await getIntegrationConfig();
    return {
      enabled: config.enabled,
      lastSync: config.lastSync || null,
      syncInterval: config.syncInterval,
    };
  } catch (error) {
    console.error("Error in getSyncStatus:", error);
    return { enabled: false, lastSync: null, syncInterval: 0 };
  }
}

export async function testTransformation() {
  try {
    const config = await getIntegrationConfig();
    const result = await generateSampleTransformation(config);
    return convertToPlainObject(result);
  } catch (error: any) {
    console.error("Error in testTransformation:", error);
    throw new Error('Falha ao testar transformação: ' + error.message);
  }
}

// --- Location Mappings Actions ---
export async function getLocationMappings() {
  try {
    const db = await dbConnect();
    const mappings = await db.collection('location_mappings').find().sort({ setor: 1, internalName: 1 }).toArray();
    return convertToPlainObject(mappings) || [];
  } catch (error) {
    console.error("Error in getLocationMappings:", error);
    return [];
  }
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
  try {
    const db = await dbConnect();
    const asgs = await db.collection('asgs').find().sort({ name: 1 }).toArray();
    return convertToPlainObject(asgs) || [];
  } catch (error) {
    console.error("Error in getAsgs:", error);
    return [];
  }
}

export async function getNextAsgCode() {
  try {
    const db = await dbConnect();
    const lastAsg = await db.collection('asgs').find().sort({ code: -1 }).limit(1).toArray();
    
    if (lastAsg.length === 0) {
      return 'ASG001';
    }

    const lastCode = lastAsg[0].code;
    const lastNumber = parseInt(lastCode.replace('ASG', ''), 10);
    const nextNumber = lastNumber + 1;
    return `ASG${String(nextNumber).padStart(3, '0')}`;
  } catch (error) {
    return 'ASG001';
  }
}

export async function createAsg(prevState: any, formData: FormData) {
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
  try {
    const db = await dbConnect();
    const areas = await db.collection('areas').find().sort({ setor: 1, locationId: 1 }).toArray();
    return convertToPlainObject(areas) || [];
  } catch (error) {
    console.error("Error in getAreas:", error);
    return [];
  }
}

export async function createArea(prevState: any, formData: FormData) {
    try {
        const rawData = {
            setor: formData.get('setor'),
            locationId: formData.get('locationId'),
            description: formData.get('description'),
        };

        const validatedFields = CreateAreaSchema.safeParse(rawData);

        if (!validatedFields.success) {
            return {
                error: "Dados inválidos.",
                fieldErrors: validatedFields.error.flatten().fieldErrors,
                success: false,
                message: 'Por favor, corrija os erros no formulário.'
            };
        }

        const { locationId, setor, description } = validatedFields.data;

        const db = await dbConnect();

        const existingArea = await db.collection('areas').findOne({ locationId });
        if (existingArea) {
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

        await db.collection('areas').insertOne(newArea);

        revalidatePath('/dashboard');
        return { success: true, message: 'Área criada com sucesso!', fieldErrors: {}, error: null };
    } catch (error: any) {
        console.error('💥 Erro fatal em createArea:', error);
        return {
            error: 'Erro interno do servidor ao criar área.',
            fieldErrors: {},
            success: false,
            message: error.message 
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
  try {
    const db = await dbConnect();
    const settings = await db.collection('system_settings').findOne({ _id: 'default' });
    if (settings) {
      const { _id, ...rest } = settings;
      return rest;
    }
  } catch (error) {
    console.error("Error in getCleaningSettings:", error);
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

export async function getCleaningOccurrences(): Promise<CleaningOccurrence[]> {
  try {
    const db = await dbConnect();
    const occurrences = await db.collection('cleaning_occurrences').find().sort({ occurredAt: -1 }).toArray();
    return convertToPlainObject(occurrences) || [];
  } catch (error) {
    console.error("Error in getCleaningOccurrences:", error);
    return [];
  }
}

// --- Report Actions ---
export async function generateReport(prevState: any, formData: FormData) {
    const rawData = {
        scope: formData.get('scope') || 'general',
        periodType: formData.get('periodType') || 'month',
        month: formData.get('month') || String(new Date().getMonth() + 1),
        year: formData.get('year') || String(new Date().getFullYear()),
        startDate: formData.get('startDate') || undefined,
        endDate: formData.get('endDate') || undefined,
        cleaningTypes: formData.getAll('cleaningTypes'),
    }

    const validatedFields = ReportFiltersSchema.safeParse(rawData);
    
    if (!validatedFields.success) {
        return {
            error: "Dados de filtro inválidos. Verifique os campos obrigatórios.",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const db = await dbConnect();
    const { scope, periodType, month, year, startDate: sDate, endDate: eDate, cleaningTypes } = validatedFields.data;
    
    let queryStartDate: Date;
    let queryEndDate: Date;

    if (periodType === 'month') {
        const monthIndex = parseInt(month || String(new Date().getMonth() + 1), 10);
        const yearIndex = parseInt(year || String(new Date().getFullYear()), 10);
        queryStartDate = new Date(yearIndex, monthIndex - 1, 1, 0, 0, 0);
        queryEndDate = new Date(yearIndex, monthIndex, 0, 23, 59, 59);
    } else if (sDate && eDate) {
        queryStartDate = new Date(sDate + 'T00:00:00');
        queryEndDate = new Date(eDate + 'T23:59:59');
    } else {
        const now = new Date();
        queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        queryEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const typeFilter = cleaningTypes && cleaningTypes.length > 0 ? { cleaningType: { $in: cleaningTypes } } : {};

    if (scope === 'general') {
        const cleaningRecords = await db.collection('cleaning_records').find({
            date: { $gte: queryStartDate, $lte: queryEndDate },
            ...typeFilter
        }).toArray() as CleaningRecord[];

        const totalNCs = await db.collection('non_conformities').countDocuments({
            timestamp: { $gte: queryStartDate, $lte: queryEndDate }
        });

        const totalAuditAptos   = await db.collection('audit_records').countDocuments({ timestamp: { $gte: queryStartDate, $lte: queryEndDate }, aptidao: 'apto' });
        const totalAuditNaoApto = await db.collection('audit_records').countDocuments({ timestamp: { $gte: queryStartDate, $lte: queryEndDate }, aptidao: 'nao_apto' });

        const total = (cleaningRecords || []).length;
        const concurrentRecords = (cleaningRecords || []).filter(r => r.cleaningType === 'concurrent');
        const terminalRecords = (cleaningRecords || []).filter(r => r.cleaningType === 'terminal');
        
        const concurrent = concurrentRecords.length;
        const terminal = terminalRecords.length;

        const totalConcurrentDuration = concurrentRecords.reduce((sum, r) => sum + r.actualDuration, 0);
        const totalTerminalDuration = terminalRecords.reduce((sum, r) => sum + r.actualDuration, 0);

        const avgConcurrentTime = concurrent > 0 ? Math.round(totalConcurrentDuration / concurrent) : 0;
        const avgTerminalTime = terminal > 0 ? Math.round(totalTerminalDuration / terminal) : 0;

        const delayed = (cleaningRecords || []).filter(r => r.delayed).length;
        const onTime = total - delayed;

        return {
            success: true,
            report: {
                scope,
                total,
                totalNCs,
                totalAuditAptos,
                totalAuditNaoApto,
                concurrent,
                terminal,
                avgConcurrentTime,
                avgTerminalTime,
                onTime,
                onTimePercent: total > 0 ? (onTime / total) * 100 : 0,
                delayed,
                delayedPercent: total > 0 ? (delayed / total) * 100 : 0,
                filters: validatedFields.data
            }
        };
    }

    if (scope === 'delays') {
        const delayedRecords = await db.collection('cleaning_records').find({
            date: { $gte: queryStartDate, $lte: queryEndDate },
            delayed: true,
            ...typeFilter
        }).sort({ date: -1 }).toArray();

        return {
            success: true,
            report: {
                scope,
                total: (delayedRecords || []).length,
                details: convertToPlainObject(delayedRecords) || [],
                filters: validatedFields.data
            }
        };
    }

    if (scope === 'nc') {
        const ncs = await db.collection('non_conformities').find({
            timestamp: { $gte: queryStartDate, $lte: queryEndDate }
        }).sort({ timestamp: -1 }).toArray();

        const ncDetails = (ncs || []).map(nc => {
            const { photoDataUri, ...rest } = nc;
            return rest;
        });

        return {
            success: true,
            report: {
                scope,
                total: ncDetails.length,
                details: convertToPlainObject(ncDetails) || [],
                filters: validatedFields.data
            }
        };
    }

    if (scope === 'audit') {
        const audits = await db.collection('audit_records').find({
            timestamp: { $gte: queryStartDate, $lte: queryEndDate }
        }).sort({ timestamp: -1 }).toArray();

        return {
            success: true,
            report: {
                scope,
                total: (audits || []).length,
                details: convertToPlainObject(audits) || [],
                filters: validatedFields.data
            }
        };
    }

    if (scope === 'history') {
        const records = await db.collection('cleaning_records').find({
            date: { $gte: queryStartDate, $lte: queryEndDate },
            ...typeFilter
        }).sort({ date: -1 }).toArray();

        // Enrich locationName with current location data (fixes "undefined" in old records)
        const locationIds = [...new Set((records || []).map((r: any) => r.locationId).filter(Boolean))];
        const validObjIds: any[] = [];
        locationIds.forEach(id => { try { validObjIds.push(new ObjectId(id as string)); } catch {} });

        const [locationDocs, areaDocs] = validObjIds.length > 0
            ? await Promise.all([
                db.collection('locations').find({ _id: { $in: validObjIds } }).toArray(),
                db.collection('areas').find({ _id: { $in: validObjIds } }).toArray(),
              ])
            : [[], []];

        const locMap: Record<string, { type: 'leito' | 'area'; doc: any }> = {};
        locationDocs.forEach((l: any) => { locMap[l._id.toString()] = { type: 'leito', doc: l }; });
        areaDocs.forEach((a: any) => { locMap[a._id.toString()] = { type: 'area', doc: a }; });

        const enrichedRecords = (records || []).map((r: any) => {
            const entry = locMap[r.locationId];
            if (!entry) return r;
            let locationName: string;
            if (entry.type === 'area') {
                locationName = entry.doc.setor || r.locationName;
            } else {
                const code = entry.doc.externalCode || '';
                const setor = entry.doc.setor || '';
                locationName = code && setor ? `${code} — ${setor}` : (r.locationName || '');
            }
            return { ...r, locationName };
        });

        return {
            success: true,
            report: {
                scope,
                total: enrichedRecords.length,
                details: convertToPlainObject(enrichedRecords) || [],
                filters: validatedFields.data
            }
        };
    }

    return { error: "Escopo de relatório inválido." };
}

// --- Scheduled Requests ---

export async function getPendingRequests(): Promise<ScheduledRequest[]> {
  try {
    const db = await dbConnect();
    const requests = await db.collection('scheduled_requests')
        .find({ status: 'agendada' })
        .sort({ requestedAt: 1 })
        .toArray();
    return convertToPlainObject(requests) || [];
  } catch (error) {
    console.error("Error in getPendingRequests:", error);
    return [];
  }
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
    
    const existingCleaning = await db.collection('active_cleanings').findOne({ locationId: location._id.toString() });
    if(existingCleaning) {
        return { success: false, error: 'Este local já está em processo de higienização.'};
    }

    const acceptLocationName = location.locationType === 'area'
        ? (location.setor || location.name)
        : location.externalCode && location.setor
            ? `${location.externalCode} — ${location.setor}`
            : location.number ? `${location.name} - ${location.number}` : location.name;

    const newActiveCleaning: Omit<ActiveCleaning, '_id'> = {
        locationId: location._id.toString(),
        locationName: acceptLocationName,
        locationType: location.locationType,
        cleaningType: request.cleaningType,
        userId: new ObjectId(user._id),
        userName: user.name,
        startTime: new Date(),
        status: 'in_progress',
        expectedDuration: request.expectedDuration,
    };
    await db.collection('active_cleanings').insertOne(newActiveCleaning);

    const collectionName = location.locationType === 'leito' ? 'locations' : 'areas';
    await db.collection(collectionName).updateOne({ _id: new ObjectId(location._id) }, { $set: { status: 'in_cleaning', updatedAt: new Date() }});
    
    const timeToAssign = Math.round((new Date().getTime() - new Date(request.requestedAt).getTime()) / 60000); 
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

// --- Non Conformities Actions ---

export async function createNonConformity(formData: FormData) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Usuário não autenticado." };
  }

  const rawData = {
    locationId: formData.get('locationId'),
    locationName: formData.get('locationName'),
    description: formData.get('description'),
    photoDataUri: formData.get('photoDataUri'),
  };

  const validatedFields = CreateNonConformitySchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Dados inválidos.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const db = await dbConnect();
    const newNC = {
      ...validatedFields.data,
      userId: new ObjectId(session.user._id),
      userName: session.user.name,
      timestamp: new Date(),
    };

    await db.collection('non_conformities').insertOne(newNC);
    
    await logAction('non_conformity_reported', { 
      locationId: validatedFields.data.locationId, 
      locationName: validatedFields.data.locationName 
    });

    // Webhook: Registro de NC
    await sendWebhookNotification('ncRegistered', { 
      local: validatedFields.data.locationName, 
      prioridade: 'ALTA' 
    });

    return { success: true, message: 'Não conformidade registrada com sucesso!' };
  } catch (error: any) {
    console.error('Erro ao registrar NC:', error);
    return { success: false, error: 'Erro interno ao registrar não conformidade.' };
  }
}

export async function getNonConformities(): Promise<NonConformity[]> {
  try {
    const db = await dbConnect();
    const ncs = await db.collection('non_conformities').find().sort({ timestamp: -1 }).toArray();
    return convertToPlainObject(ncs) || [];
  } catch (error) {
    console.error("Error in getNonConformities:", error);
    return [];
  }
}

// --- USER MANAGEMENT ACTIONS ---

export async function getUsers(): Promise<User[]> {
  try {
    const db = await dbConnect();
    const users = await db.collection('users').find().sort({ name: 1 }).toArray();
    return convertToPlainObject(users) || [];
  } catch (error) {
    console.error("Error in getUsers:", error);
    return [];
  }
}

export async function createUser(prevState: any, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = CreateUserSchema.safeParse(rawData);

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
      error: "Este login já está em uso.",
      fieldErrors: { login: ["Login indisponível."] },
    };
  }

  await db.collection('users').insertOne({
    ...validatedFields.data,
    active: true,
    createdAt: new Date(),
  });

  revalidatePath('/dashboard');
  return { success: true, message: "Usuário criado com sucesso!" };
}

export async function updateUser(id: string, prevState: any, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validatedFields = UpdateUserSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      error: "Dados inválidos.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const db = await dbConnect();
  const { name, login, perfil, password } = validatedFields.data;

  const updateData: any = {
    name,
    login,
    active: formData.get('active') === 'on',
    perfil,
    updatedAt: new Date(),
  };

  if (password) {
    updateData.password = password;
  }

  await db.collection('users').updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  revalidatePath('/dashboard');
  return { success: true, message: "Usuário atualizado com sucesso!" };
}

export async function toggleUserActive(id: string, active: boolean) {
  const db = await dbConnect();
  const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
  
  if (user?.login === 'admin') {
    return { error: 'Não é possível desativar o administrador principal.' };
  }

  await db.collection('users').updateOne(
    { _id: new ObjectId(id) },
    { $set: { active } }
  );

  revalidatePath('/dashboard');
  return { success: true, message: `Usuário ${active ? 'ativado' : 'desativado'} com sucesso!` };
}

// --- Logs and Contexts ---

export async function getLogs() {
  try {
    const db = await dbConnect();
    const logs = await db.collection('app_logs').find().sort({ timestamp: -1 }).limit(100).toArray();
    return convertToPlainObject(logs) || [];
  } catch (error) {
    console.error("Error in getLogs:", error);
    return [];
  }
}

export async function getLastCleaningRecord(locationId: string): Promise<CleaningRecord | null> {
  try {
    const db = await dbConnect();
    const lastRecord = await db.collection('cleaning_records')
        .find({ locationId: locationId.toString(), status: 'completed' })
        .sort({ finishTime: -1 })
        .limit(1)
        .toArray();
    
    if (!lastRecord || lastRecord.length === 0) return null;
    return convertToPlainObject(lastRecord[0]);
  } catch (error) {
    console.error("Error in getLastCleaningRecord:", error);
    return null;
  }
}

// --- WEBHOOK ACTIONS ---

export async function getWebhookSettings(): Promise<WebhookSettings> {
  try {
    const db = await dbConnect();
    const settings = await db.collection('system_settings').findOne({ _id: 'webhook' });
    
    if (settings) {
      const { _id, ...rest } = settings;
      return convertToPlainObject({
        ...rest,
        enabledEvents: rest.enabledEvents || {
          newRequest:        true,
          cleaningFinished:  false,
          auditFinished:     true,
          checklistFinished: true,
          ncRegistered:      true,
        }
      });
    }
  } catch (error) {
    console.error("Error in getWebhookSettings:", error);
  }
  return {
    url: '',
    template: '🔔 Nova solicitação: {local} | Tipo: {tipo_limpeza} | Horário: {horario}',
    enabledEvents: {
      newRequest:        true,
      cleaningFinished:  false,
      auditFinished:     true,
      checklistFinished: true,
      ncRegistered:      true,
    }
  };
}

export async function saveWebhookSettings(settings: WebhookSettings) {
  try {
    const validated = WebhookSettingsSchema.safeParse(settings);
    if (!validated.success) return { error: "Configurações inválidas." };

    const db = await dbConnect();
    await db.collection('system_settings').updateOne(
      { _id: 'webhook' },
      { $set: { ...validated.data, updatedAt: new Date() } },
      { upsert: true }
    );
    return { success: true, message: "Configurações de Webhook salvas!" };
  } catch (error: any) {
    return { error: "Erro ao salvar: " + error.message };
  }
}

export async function testWebhookConnection(url: string) {
  if (!url) return { error: "URL do Webhook é obrigatória." };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "✅ Conexão NAVI estabelecida com sucesso! Este é um disparo de teste."
      }),
    });

    if (response.ok) {
      return { success: true, message: "Webhook validado com sucesso!" };
    } else {
      return { error: `Falha na conexão (Status: ${response.status}). Verifique a URL.` };
    }
  } catch (error: any) {
    return { error: "Falha na conexão. Verifique a URL e a rede interna." };
  }
}

// --- VIEW MODE ACTIONS ---

export type ViewMode = 'solicitation' | 'view_only';

export async function getViewMode(): Promise<ViewMode> {
  try {
    const db = await dbConnect();
    const doc = await db.collection('system_settings').findOne({ _id: 'viewMode' });
    return (doc?.value as ViewMode) || 'solicitation';
  } catch {
    return 'solicitation';
  }
}

export async function saveViewMode(mode: ViewMode) {
  try {
    const session = await getSession();
    if (!session?.user || session.user.perfil !== 'admin') {
      return { error: 'Acesso negado.' };
    }
    const db = await dbConnect();
    await db.collection('system_settings').updateOne(
      { _id: 'viewMode' },
      { $set: { value: mode, updatedAt: new Date() } },
      { upsert: true }
    );
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
