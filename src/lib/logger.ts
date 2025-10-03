import winston from 'winston';

// Configuração do logger
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cleanflow-sync' },
  transports: [
    // Para ambientes de desenvolvimento e produção na nuvem, logar no console é o mais comum.
    // O sistema de hospedagem (como o Firebase App Hosting) coletará esses logs.
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// Logger específico para sincronização
export const syncLogger = logger.child({ module: 'sync' });
