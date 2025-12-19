/**
 * Centralized logging utility
 * Provides consistent logging across the application with environment-aware behavior
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enableInProduction: boolean;
  logLevel: LogLevel;
}

class Logger {
  private config: LoggerConfig = {
    enableInProduction: false,
    logLevel: __DEV__ ? 'debug' : 'error',
  };

  /**
   * Check if logging should occur for a given level
   */
  private shouldLog(level: LogLevel): boolean {
    if (__DEV__) return true;
    
    // In production, only log warnings and errors
    if (this.config.enableInProduction) {
      return ['warn', 'error'].includes(level);
    }
    
    return level === 'error';
  }

  /**
   * Get emoji prefix for log level
   */
  private getPrefix(level: LogLevel): string {
    const prefixes: Record<LogLevel, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    };
    return prefixes[level];
  }

  /**
   * Debug-level logging (development only)
   */
  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`${this.getPrefix('debug')} [DEBUG]`, ...args);
    }
  }

  /**
   * Info-level logging
   */
  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`${this.getPrefix('info')} [INFO]`, ...args);
    }
  }

  /**
   * Warning-level logging
   */
  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`${this.getPrefix('warn')} [WARN]`, ...args);
    }
  }

  /**
   * Error-level logging (always enabled)
   */
  error(...args: any[]): void {
    console.error(`${this.getPrefix('error')} [ERROR]`, ...args);
  }

  /**
   * Log API requests (development only)
   */
  apiRequest(method: string, url: string): void {
    if (this.shouldLog('debug')) {
      console.log(`🚀 API Request: ${method.toUpperCase()} ${url}`);
    }
  }

  /**
   * Log API responses (development only)
   */
  apiResponse(status: number, url: string): void {
    if (this.shouldLog('debug')) {
      console.log(`✅ API Response: ${status} ${url}`);
    }
  }

  /**
   * Log API errors
   */
  apiError(status: number, url: string, message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(`❌ API Error ${status} on ${url}: ${message}`);
    }
  }

  /**
   * Configure logger behavior
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other modules
export type { LogLevel, LoggerConfig };

