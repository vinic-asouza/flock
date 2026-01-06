/**
 * Utilitário de logging estruturado
 * Fornece logs consistentes e estruturados para facilitar debugging e monitoramento
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  userId?: string;
  churchId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeEventId?: string;
  planType?: string;
  subscriptionStatus?: string;
  [key: string]: any;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: Error): string {
    const timestamp = new Date().toISOString();
    const logEntry: any = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };
    }

    return JSON.stringify(logEntry);
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const formatted = this.formatMessage(level, message, context, error);
    
    switch (level) {
      case LogLevel.DEBUG:
        if (process.env.NODE_ENV === 'development') {
          console.debug(formatted);
        }
        break;
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  // Métodos específicos para operações do Stripe
  stripeEvent(eventType: string, eventId: string, context?: LogContext): void {
    this.info(`Stripe webhook event: ${eventType}`, {
      stripeEventId: eventId,
      stripeEventType: eventType,
      ...context,
    });
  }

  stripeOperation(operation: string, context?: LogContext): void {
    this.info(`Stripe operation: ${operation}`, context);
  }

  subscriptionChange(
    action: 'created' | 'updated' | 'deleted' | 'canceled' | 'synced',
    context?: LogContext
  ): void {
    this.info(`Subscription ${action}`, {
      action: `subscription_${action}`,
      ...context,
    });
  }

  paymentFlow(step: string, context?: LogContext): void {
    this.info(`Payment flow: ${step}`, {
      paymentFlowStep: step,
      ...context,
    });
  }
}

// Exportar instância singleton
export const logger = new Logger();

// Exportar funções auxiliares para facilitar uso
export const logStripeEvent = (eventType: string, eventId: string, context?: LogContext) => {
  logger.stripeEvent(eventType, eventId, context);
};

export const logStripeOperation = (operation: string, context?: LogContext) => {
  logger.stripeOperation(operation, context);
};

export const logSubscriptionChange = (
  action: 'created' | 'updated' | 'deleted' | 'canceled' | 'synced',
  context?: LogContext
) => {
  logger.subscriptionChange(action, context);
};

export const logPaymentFlow = (step: string, context?: LogContext) => {
  logger.paymentFlow(step, context);
};

