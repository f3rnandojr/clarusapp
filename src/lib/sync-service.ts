import cron from 'node-cron';
import { getIntegrationConfig, runManualSync } from './actions';
import { syncLogger } from './logger';

class SyncService {
  private isRunning: boolean = false;
  private currentJob: cron.ScheduledTask | null = null;
  private lastRun: Date | null = null;
  private nextRun: Date | null = null;
  private currentInterval: number | null = null;

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    syncLogger.info('Serviço de sincronização inicializado');
    
    // Verificar configuração a cada minuto
    setInterval(() => this.checkAndSchedule(), 60000);
    
    // Verificar imediatamente ao iniciar
    await this.checkAndSchedule();
  }

  private async checkAndSchedule() {
    try {
      const config = await getIntegrationConfig();
      
      if (config.enabled && config.syncInterval > 0) {
        this.scheduleSync(config.syncInterval);
      } else {
        this.stopSync();
      }
    } catch (error: any) {
      syncLogger.error('Erro ao verificar configuração de sync:', { error: error.message });
    }
  }

  private scheduleSync(intervalMinutes: number) {
    if (this.currentJob && this.currentInterval === intervalMinutes) {
      return;
    }

    this.stopSync();

    const cronExpression = `*/${intervalMinutes} * * * *`;
    syncLogger.info(`Agendando sincronização automática: ${cronExpression}`);
    this.currentInterval = intervalMinutes;

    this.currentJob = cron.schedule(cronExpression, async () => {
      syncLogger.info('Disparando sincronização agendada');
      await this.executeScheduledSync('scheduled');
    }, {
      scheduled: true,
      timezone: "America/Sao_Paulo"
    });

    this.calculateNextRun(intervalMinutes);
  }

  private stopSync() {
    if (this.currentJob) {
      this.currentJob.stop();
      this.currentJob = null;
      this.currentInterval = null;
      this.nextRun = null;
      syncLogger.info('Sincronização automática parada');
    }
  }

  private async executeScheduledSync(type: 'scheduled' | 'manual' = 'scheduled') {
    if (this.isRunning) {
      syncLogger.warn('Sincronização já em andamento, ignorando nova execução', { type });
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();
    this.nextRun = null; 

    try {
      syncLogger.info(`Iniciando execução de sync (${type})`);
      const result = await runManualSync();
      
      if (result.success) {
        syncLogger.info(`Sync (${type}) concluído com sucesso`, { stats: result.stats });
      } else {
        syncLogger.error(`Sync (${type}) falhou`, { error: result.message, stats: result.stats });
      }
    } catch (error: any) {
      syncLogger.error(`Erro não tratado na execução de sync (${type})`, { error: error.message });
    } finally {
      this.isRunning = false;
      if (this.currentInterval) {
        this.calculateNextRun(this.currentInterval);
      }
    }
  }

  private calculateNextRun(intervalMinutes: number) {
    if (this.currentJob) {
      const next = new Date();
      next.setMinutes(next.getMinutes() + intervalMinutes);
      this.nextRun = next;
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: !!this.currentJob,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      currentInterval: this.currentInterval
    };
  }

  public async forceSync() {
    if (this.isRunning) {
      throw new Error('Sincronização já está em andamento');
    }
    syncLogger.info('Sincronização forçada iniciada');
    await this.executeScheduledSync('manual');
    return this.getStatus();
  }

  public stopService() {
    this.stopSync();
    syncLogger.info('Serviço de sincronização parado permanentemente');
  }
}

export const syncService = new SyncService();
