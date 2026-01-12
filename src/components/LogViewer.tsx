import React, { useState, useMemo, useCallback } from 'react';
import { Search, ChevronDown, Filter } from 'lucide-react';
import { LogEntry, LogLevel, ParsedLog } from '../types/log';
import { parseLogFile, filterLogs } from '../utils/logParser';
import { FileUpload } from './FileUpload';
import { Timeline } from './Timeline';
import { LogTable } from './LogTable';
import { LogDetail } from './LogDetail';

const AVAILABLE_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];

export const LogViewer: React.FC = () => {
  const [parsedLog, setParsedLog] = useState<ParsedLog | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>([]);
  const [showLevelFilter, setShowLevelFilter] = useState(false);

  const handleFileLoad = useCallback((content: string, name: string) => {
    const parsed = parseLogFile(content);
    setParsedLog(parsed);
    setSelectedEntry(null);
    setSearchQuery('');
    setSelectedLevels([]);
  }, []);

  const filteredEntries = useMemo(() => {
    if (!parsedLog) return [];
    return filterLogs(parsedLog.entries, searchQuery, selectedLevels);
  }, [parsedLog, searchQuery, selectedLevels]);

  const handleLevelToggle = (level: LogLevel) => {
    setSelectedLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const clearFilters = () => {
    setSelectedLevels([]);
    setSearchQuery('');
  };

  const hasFilters = selectedLevels.length > 0 || searchQuery.length > 0;

  return (
    <div className="log-viewer">
      <header className="log-viewer-header">
        <div className="header-center">
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search for logs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="header-right">
          <div className="filter-dropdown">
            <button
              className={`filter-btn ${selectedLevels.length > 0 ? 'active' : ''}`}
              onClick={() => setShowLevelFilter(!showLevelFilter)}
            >
              <Filter size={16} />
              <span>Level</span>
              {selectedLevels.length > 0 && (
                <span className="filter-count">{selectedLevels.length}</span>
              )}
              <ChevronDown size={14} />
            </button>
            {showLevelFilter && (
              <div className="filter-menu">
                {AVAILABLE_LEVELS.map(level => (
                  <label key={level} className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedLevels.includes(level)}
                      onChange={() => handleLevelToggle(level)}
                    />
                    <span className={`level-label ${level}`}>{level.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <FileUpload onFileLoad={handleFileLoad} compact />
        </div>
      </header>

      {hasFilters && (
        <div className="active-filters">
          <span className="filter-label">Filters:</span>
          {selectedLevels.map(level => (
            <span key={level} className="filter-tag level">
              {level.toUpperCase()}
              <button onClick={() => handleLevelToggle(level)}>×</button>
            </span>
          ))}
          {searchQuery && (
            <span className="filter-tag search">
              "{searchQuery}"
              <button onClick={() => setSearchQuery('')}>×</button>
            </span>
          )}
          <button className="clear-filters" onClick={clearFilters}>
            Clear all
          </button>
        </div>
      )}

      <div className="log-viewer-body">
        <div className="main-content">
          {parsedLog ? (
            <>
              <Timeline entries={filteredEntries} />

              <div className="log-table-header">
                <span className="col-header time">Time</span>
                <span className="col-header level">Level</span>
                <span className="col-header message">Message</span>
              </div>

              <LogTable
                entries={filteredEntries}
                selectedId={selectedEntry?.id || null}
                onSelect={setSelectedEntry}
              />

              <div className="log-footer">
                <span className="log-count">{filteredEntries.length} logs</span>
              </div>
            </>
          ) : (
            <div className="no-logs-message">
              <p>No Logs available</p>
              <p className="no-logs-hint">Upload a log file to get started</p>
            </div>
          )}
        </div>

        {selectedEntry && (
          <>
            <div
              className="log-detail-backdrop"
              onClick={() => setSelectedEntry(null)}
            />
            <LogDetail
              entry={selectedEntry}
              onClose={() => setSelectedEntry(null)}
            />
          </>
        )}
      </div>
    </div>
  );
};
