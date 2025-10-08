import { z } from "zod";

// --- AUTH ---
export const LoginSchema = z.object({
  login: z.string().min(1, "Login é obrigatório."),
  password: z.string().min(1, "Senha é obrigatória."),
});

// --- CORE ---

export const LocationStatusEnum = z.enum(["available", "in_cleaning", "occupied"]);
export type LocationStatus = z.infer<typeof LocationStatusEnum>;

export const CleaningTypeEnum = z.enum(["concurrent", "terminal"]);
export type CleaningType = z.infer<typeof CleaningTypeEnum>;

export const AsgStatusEnum = z.enum(["available", "busy"]);

export const AsgSchema = z.object({
  _id: z.union([z.string(), z.any()]),
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  code: z.string().min(3, { message: "O código deve ter pelo menos 3 caracteres." }),
  status: AsgStatusEnum,
  active: z.boolean(),
  createdAt: z.union([z.string(), z.date()]),
});
export type Asg = z.infer<typeof AsgSchema>;

export const CurrentCleaningSchema = z.object({
    type: CleaningTypeEnum,
    userId: z.union([z.string(), z.any()]),
    userName: z.string(),
    startTime: z.union([z.string(), z.date()]),
  }).nullable();


export const LocationSchema = z.object({
  _id: z.union([z.string(), z.any()]),
  name: z.string(),
  number: z.string(),
  status: LocationStatusEnum,
  currentCleaning: CurrentCleaningSchema,
  externalCode: z.string().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});
export type Location = z.infer<typeof LocationSchema>;

// --- Areas (QR Code) ---
export const AreaSchema = z.object({
  _id: z.union([z.string(), z.any()]),
  setor: z.string().min(3, "Setor é obrigatório e deve ter no mínimo 3 caracteres."),
  locationId: z.string().min(3, "ID da Localização é obrigatório e deve ter no mínimo 3 caracteres.").regex(/^[a-z0-9-]+$/, "ID da Localização deve conter apenas letras minúsculas, números e hífens."),
  description: z.string().optional(),
  qrCodeUrl: z.string(),
  shortCode: z.string(),
  isActive: z.boolean(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});
export type Area = z.infer<typeof AreaSchema>;

export const CreateAreaSchema = AreaSchema.pick({
  setor: true,
  locationId: true,
  description: true,
});

export const UpdateAreaSchema = AreaSchema.pick({
  setor: true,
  description: true,
});


export const CreateAsgSchema = AsgSchema.pick({
  name: true,
  code: true, 
}).extend({
  code: z.string().min(3, "Código é obrigatório")
});

export const UpdateAsgSchema = AsgSchema.pick({
  name: true,
  code: true,
  active: true,
});

export const StartCleaningFormSchema = z.object({
  locationId: z.string(),
  type: CleaningTypeEnum,
});

export const CleaningSettingsSchema = z.object({
  concurrent: z.number().min(1, 'Deve ser maior que 0'),
  terminal: z.number().min(1, 'Deve ser maior que 0'),
});
export type CleaningSettings = z.infer<typeof CleaningSettingsSchema>;

export const UpdateCleaningSettingsSchema = CleaningSettingsSchema.pick({
  concurrent: true,
  terminal: true
});

export const CleaningOccurrenceSchema = z.object({
  _id: z.union([z.string(), z.any()]),
  locationName: z.string(),
  cleaningType: CleaningTypeEnum,
  userName: z.string(), // MUDOU de asgName
  delayInMinutes: z.number(),
  occurredAt: z.union([z.string(), z.date()]),
});
export type CleaningOccurrence = z.infer<typeof CleaningOccurrenceSchema>;

export const CleaningRecordSchema = z.object({
    _id: z.union([z.string(), z.any()]),
    locationId: z.string(),
    locationName: z.string(),
    locationType: z.enum(['area', 'leito']),
    cleaningType: CleaningTypeEnum,
    userId: z.union([z.string(), z.any()]),
    userName: z.string(),
    startTime: z.union([z.string(), z.date()]),
    finishTime: z.union([z.string(), z.date()]),
    expectedDuration: z.number(),
    actualDuration: z.number(),
    status: z.enum(['in_progress', 'completed']),
    delayed: z.boolean(),
    date: z.union([z.string(), z.date()]),
});
export type CleaningRecord = z.infer<typeof CleaningRecordSchema>;

export const ReportFiltersSchema = z.object({
    month: z.string().min(1, "Mês é obrigatório"),
    year: z.string().min(4, "Ano é obrigatório"),
    cleaningTypes: z.array(CleaningTypeEnum).min(1, { message: "Selecione ao menos um tipo de limpeza." }),
});

export type ReportFilters = z.infer<typeof ReportFiltersSchema>;

export const UserSchema = z.object({
  _id: z.union([z.string(), z.any()]),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
  login: z.string().min(3, "Login deve ter pelo menos 3 caracteres."),
  password: z.string().min(4, "Senha deve ter pelo menos 4 caracteres."),
  active: z.boolean(),
  createdAt: z.union([z.string(), z.date()]),
});
export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.pick({
    name: true,
    login: true,
    password: true,
});

export const UpdateUserSchema = UserSchema.pick({
    name: true,
    login: true,
    active: true,
}).extend({
    password: z.string().optional(),
});


// Schema para configurações de integração
export const IntegrationConfigSchema = z.object({
  _id: z.union([z.string(), z.any()]),
  enabled: z.boolean().default(false),
  host: z.string(),
  port: z.number().default(5432),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  syncInterval: z.number().default(5),
  query: z.string().default("SELECT code1, tipobloq FROM cable1"),
  
  // Mapeamento de status aprimorado
  statusMappings: z.object({
    available: z.string().default("L"),
    occupied: z.string().default("*"),
    in_cleaning: z.string().optional(), // Para sistemas que têm status de limpeza
  }),
  
  // Mapeamento de campos flexível
  fieldMappings: z.object({
    codeField: z.string().default("code1"),
    statusField: z.string().default("tipobloq"),
    nameField: z.string().optional(), // Campo específico para nome (se existir)
    numberField: z.string().optional(), // Campo específico para número (se existir)
  }),
  
  // Configurações de transformação avançadas
  transformation: z.object({
    nameSeparator: z.string().default(" "), // Como separar code1 em name/number
    namePattern: z.string().optional(), // Regex para extrair nome: "([A-Za-z]+)"
    numberPattern: z.string().optional(), // Regex para extrair número: "([0-9]+)"
    customTransform: z.boolean().default(false), // Usar transformação customizada
  }),
  
  lastSync: z.date().optional(),
  lastSyncStats: z.object({
    total: z.number().default(0),
    updated: z.number().default(0),
    created: z.number().default(0),
    skipped: z.number().default(0),
    errors: z.number().default(0),
  }).optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;
