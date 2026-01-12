import { LogEntry, ParsedLog, LogLevel } from '../types/log';

let idCounter = 0;

function generateId(): string {
  return `log-${Date.now()}-${idCounter++}`;
}

function detectLogLevel(text: string): LogLevel {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('fatal') || lowerText.includes('critical')) return 'fatal';
  if (lowerText.includes('error') || lowerText.includes('err]') || lowerText === 'error') return 'error';
  if (lowerText.includes('warn') || lowerText.includes('warning')) return 'warn';
  if (lowerText.includes('debug') || lowerText.includes('dbg')) return 'debug';
  if (lowerText.includes('info')) return 'info';
  return 'info';
}

function extractTimestamp(line: string): string | null {
  // ISO 8601 format
  const isoMatch = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/);
  if (isoMatch) return isoMatch[0];

  // Common log format: 2026-01-09 20:52:09.651
  const commonMatch = line.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(\.\d+)?/);
  if (commonMatch) return commonMatch[0].replace(' ', 'T') + 'Z';

  // Apache/nginx style: 09/Jan/2026:20:52:09
  const apacheMatch = line.match(/\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2}/);
  if (apacheMatch) {
    const parts = apacheMatch[0].match(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/);
    if (parts) {
      const months: Record<string, string> = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      return `${parts[3]}-${months[parts[2]]}-${parts[1]}T${parts[4]}:${parts[5]}:${parts[6]}Z`;
    }
  }

  return null;
}

function parseJsonLog(line: string): LogEntry | null {
  try {
    const parsed = JSON.parse(line);
    
    // Handle different JSON log formats
    const levelRaw = parsed.level || parsed.severity || parsed.log_level || parsed.loglevel || 'info';
    const level = detectLogLevel(String(levelRaw));
    
    // Get timestamp from various common fields
    const timestamp = parsed.dt || parsed.timestamp || parsed.time || parsed['@timestamp'] || 
                     parsed.date || parsed.datetime || new Date().toISOString();
    
    // Get message from various common fields
    const message = parsed.message || parsed.msg || parsed.text || parsed.log || 
                   parsed.body || JSON.stringify(parsed);
    
    return {
      id: generateId(),
      dt: timestamp,
      level,
      pid: parsed.pid,
      hostname: parsed.hostname || parsed.host,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      message_field: parsed.message_field,
      data: parsed,
      raw: line
    };
  } catch {
    return null;
  }
}

function parseStructuredTextLog(line: string): LogEntry | null {
  // Pattern: [timestamp] [LEVEL] {json} or [timestamp] [LEVEL] message
  const structuredMatch = line.match(/^\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.+)$/);
  
  if (structuredMatch) {
    const [, timestampPart, levelPart, rest] = structuredMatch;
    const level = detectLogLevel(levelPart);
    
    // Try to parse the rest as JSON
    let data: Record<string, unknown> | undefined;
    let message: string = rest;
    
    if (rest.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(rest) as Record<string, unknown>;
        data = parsed;
        const msgValue = parsed.message || parsed.msg || rest;
        message = typeof msgValue === 'string' ? msgValue : JSON.stringify(msgValue);
      } catch {
        // Not valid JSON, use as-is
      }
    }
    
    return {
      id: generateId(),
      dt: timestampPart.includes('T') ? timestampPart : timestampPart.replace(' ', 'T') + 'Z',
      level,
      message,
      data,
      raw: line
    };
  }
  
  return null;
}

function parsePlainTextLog(line: string): LogEntry {
  const timestamp = extractTimestamp(line);
  const level = detectLogLevel(line);

  // Clean up message - remove timestamp if found at the start
  let message = line;
  if (timestamp) {
    // Remove the timestamp from the message
    message = line.replace(timestamp, '').trim();
    // Also try removing space-separated format
    message = message.replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(\.\d+)?\s*/, '').trim();
  }
  
  // Remove level indicators from message start
  message = message.replace(/^\s*\[(INFO|WARN|WARNING|ERROR|DEBUG|FATAL|CRITICAL)\]\s*/i, '').trim();

  return {
    id: generateId(),
    dt: timestamp || new Date().toISOString(),
    level,
    message: message || line,
    raw: line
  };
}

export function parseLogFile(content: string): ParsedLog {
  const lines = content.split('\n').filter(line => line.trim());
  const entries: LogEntry[] = [];
  const levelsSet = new Set<string>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const line of lines) {
    let entry: LogEntry | null = null;

    // Try JSON first (line starts with {)
    if (line.trim().startsWith('{')) {
      entry = parseJsonLog(line);
    }
    
    // Try structured text format: [timestamp] [LEVEL] ...
    if (!entry) {
      entry = parseStructuredTextLog(line);
    }

    // Fall back to plain text parsing
    if (!entry) {
      entry = parsePlainTextLog(line);
    }

    if (entry) {
      entries.push(entry);
      levelsSet.add(entry.level);

      const entryDate = new Date(entry.dt);
      if (!isNaN(entryDate.getTime())) {
        if (!minDate || entryDate < minDate) minDate = entryDate;
        if (!maxDate || entryDate > maxDate) maxDate = entryDate;
      }
    }
  }

  return {
    entries,
    levels: Array.from(levelsSet).sort(),
    dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : null
  };
}

export function filterLogs(
  entries: LogEntry[],
  search: string,
  levels: LogLevel[]
): LogEntry[] {
  return entries.filter(entry => {
    // Level filter
    if (levels.length > 0 && !levels.includes(entry.level)) {
      return false;
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesMessage = entry.message.toLowerCase().includes(searchLower);
      const matchesData = entry.data && JSON.stringify(entry.data).toLowerCase().includes(searchLower);
      
      if (!matchesMessage && !matchesData) {
        return false;
      }
    }

    return true;
  });
}
