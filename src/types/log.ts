export interface LogEntry {
  id: string;
  dt: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  pid?: number;
  hostname?: string;
  message: string;
  message_field?: string;
  data?: Record<string, unknown>;
  raw?: string;
}

export interface ParsedLog {
  entries: LogEntry[];
  levels: string[];
  dateRange: {
    start: Date;
    end: Date;
  } | null;
}

export type LogLevel = LogEntry['level'];

export interface TimelineBucket {
  timestamp: Date;
  count: number;
  byLevel: Record<LogLevel, number>;
}

export interface FilterState {
  search: string;
  levels: LogLevel[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

