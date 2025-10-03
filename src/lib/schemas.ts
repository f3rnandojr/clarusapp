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
    asgId: z.union([z.string(), z.any()]),
    asgName: z.string(),
    startTime: z.union([z.string(), z.date()]),
  }).nullable();


export const LocationSchema = z.object({
  _id: z.union([z.string(), z.any()]),
  name: z.string(),
  number: z.string(),
  status: LocationStatusEnum,
  currentCleaning: CurrentCleaningSchema,
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});
export type Location = z.infer<typeof LocationSchema>;

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
  asgId: z.string().min(1, { message: "É necessário selecionar um colaborador." }),
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
  asgName: z.string(),
  delayInMinutes: z.number(),
  occurredAt: z.union([z.string(), z.date()]),
});
export type CleaningOccurrence = z.infer<typeof CleaningOccurrenceSchema>;

export const CleaningRecordSchema = z.object({
    _id: z.union([z.string(), z.any()]),
    locationName: z.string(),
    cleaningType: CleaningTypeEnum,
    asgName: z.string(),
    startTime: z.union([z.string(), z.date()]),
    finishTime: z.union([z.string(), z.date()]),
    expectedDuration: z.number(),
    actualDuration: z.number(),
    status: z.literal('completed'),
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
