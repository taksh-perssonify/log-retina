import React from 'react';
import { LogEntry, LogLevel } from '../types/log';
import { format } from 'date-fns';

interface LogTableProps {
  entries: LogEntry[];
  selectedId: string | null;
  onSelect: (entry: LogEntry) => void;
}

const LEVEL_CONFIG: Record<LogLevel, { color: string; bg: string }> = {
  debug: { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.15)' },
  info: { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' },
  warn: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  error: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  fatal: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' }
};

export const LogTable: React.FC<LogTableProps> = ({ entries, selectedId, onSelect }) => {
  const formatTime = (dt: string): string => {
    try {
      const date = new Date(dt);
      if (isNaN(date.getTime())) return dt;
      return format(date, 'yyyy-MM-dd HH:mm:ss.SSS');
    } catch {
      return dt;
    }
  };

  const truncateMessage = (message: string, maxLength: number = 150): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const getMessageText = (entry: LogEntry): string => {
    const parts = entry.message.split('}} ');
    if (parts.length <= 1) {
        return truncateMessage(entry.message);
    }

    try {
        const data = JSON.parse(parts[0] + '}}');
        return data.message;
    } catch {
        return truncateMessage(entry.message);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="log-table-empty">
        <p>No logs to display</p>
        <p className="log-table-empty-hint">Upload a log file to get started</p>
      </div>
    );
  }

  return (
    <div className="log-table-container">
      <table className="log-table">
        <thead>
          <tr>
            <th className="col-time">Time</th>
            <th className="col-level">Level</th>
            <th className="col-message">Message</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const levelConfig = LEVEL_CONFIG[entry.level];
            const isSelected = entry.id === selectedId;

            return (
              <tr
                key={entry.id}
                className={`log-row ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(entry)}
              >
                <td className="col-time">
                  <span className="time-value">{formatTime(entry.dt)}</span>
                </td>
                <td className="col-level">
                  <span
                    className="level-badge"
                    style={{
                      color: levelConfig.color,
                      backgroundColor: levelConfig.bg
                    }}
                  >
                    <span className="level-dot" style={{ backgroundColor: levelConfig.color }} />
                    {entry.level.toUpperCase()}
                  </span>
                </td>
                <td className="col-message">
                  <span className="message-text">{getMessageText(entry)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
