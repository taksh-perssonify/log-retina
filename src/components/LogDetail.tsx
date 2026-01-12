import React, { useState, useMemo } from 'react';
import { LogEntry } from '../types/log';
import { X, ChevronRight, ChevronDown, Copy, Check, Link } from 'lucide-react';
import { format } from 'date-fns';

interface LogDetailProps {
  entry: LogEntry;
  onClose: () => void;
}

type Tab = 'overview' | 'context' | 'raw';

interface JsonViewerProps {
  data: unknown;
  depth?: number;
  expanded?: boolean;
  propertyKey?: string;
}

const CopyButton: React.FC<{ value: unknown }> = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button className="json-copy-btn" onClick={handleCopy} title="Copy value">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
};

const JsonViewer: React.FC<JsonViewerProps> = ({ data, depth = 0, expanded = true, propertyKey }) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  if (data === null) {
    return (
      <span className="json-value-wrapper">
        <span className="json-null">null</span>
        <CopyButton value={null} />
      </span>
    );
  }
  if (data === undefined) {
    return (
      <span className="json-value-wrapper">
        <span className="json-undefined">undefined</span>
        <CopyButton value={undefined} />
      </span>
    );
  }
  if (typeof data === 'boolean') {
    return (
      <span className="json-value-wrapper">
        <span className="json-boolean">{data.toString()}</span>
        <CopyButton value={data} />
      </span>
    );
  }
  if (typeof data === 'number') {
    return (
      <span className="json-value-wrapper">
        <span className="json-number">{data}</span>
        <CopyButton value={data} />
      </span>
    );
  }
  if (typeof data === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
      try {
        const date = new Date(data);
        const formatted = format(date, "MMM d, yyyy 'at' h:mm:ssaa");
        return (
          <span className="json-value-wrapper">
            <span className="json-string">
              "{data}"<span className="json-comment">{` // ${formatted}`}</span>
            </span>
            <CopyButton value={data} />
          </span>
        );
      } catch {
        return (
          <span className="json-value-wrapper">
            <span className="json-string">"{data}"</span>
            <CopyButton value={data} />
          </span>
        );
      }
    }
    return (
      <span className="json-value-wrapper">
        <span className="json-string">"{data}"</span>
        <CopyButton value={data} />
      </span>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <span className="json-value-wrapper">
          <span className="json-bracket">[]</span>
          <CopyButton value={data} />
        </span>
      );
    }

    return (
      <div className="json-array">
        <span className="json-toggle" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="json-bracket">[</span>
        <CopyButton value={data} />
        {isExpanded ? (
          <div className="json-content">
            {data.map((item, index) => (
              <div key={index} className="json-item">
                <JsonViewer data={item} depth={depth + 1} />
                {index < data.length - 1 && <span className="json-comma">,</span>}
              </div>
            ))}
          </div>
        ) : (
          <span className="json-collapsed">...{data.length} items</span>
        )}
        <span className="json-bracket">]</span>
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return (
        <span className="json-value-wrapper">
          <span className="json-bracket">{'{}'}</span>
          <CopyButton value={data} />
        </span>
      );
    }

    return (
      <div className="json-object">
        <span className="json-toggle" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="json-bracket">{'{'}</span>
        <CopyButton value={data} />
        {isExpanded ? (
          <div className="json-content">
            {entries.map(([key, value], index) => (
              <div key={key} className="json-property">
                <span className="json-key">"{key}"</span>
                <span className="json-colon">: </span>
                <JsonViewer data={value} depth={depth + 1} propertyKey={key} />
                {index < entries.length - 1 && <span className="json-comma">,</span>}
              </div>
            ))}
          </div>
        ) : (
          <span className="json-collapsed">...{entries.length} fields</span>
        )}
        <span className="json-bracket">{'}'}</span>
      </div>
    );
  }

  return <span>{String(data)}</span>;
};

export const LogDetail: React.FC<LogDetailProps> = ({ entry, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [copied, setCopied] = useState(false);
  const [expandAll, setExpandAll] = useState(false);

  const formatDateTime = (dt: string): string => {
    try {
      const date = new Date(dt);
      if (isNaN(date.getTime())) return dt;
      return format(date, "MMM d, yyyy 'at' h:mm:ss.SSSaa");
    } catch {
      return dt;
    }
  };

  const parsedData = useMemo(() => {
    if (entry.data && typeof entry.data === 'object') {
      return entry.data;
    }

    try {
      const parts = entry.message.split('}} ');
      if (parts.length > 1) {
        const parsed = JSON.parse(parts[0] + '}}');
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } else {
        throw new Error('Failed to parse message as JSON');
      }
    } catch {
      console.log('Failed to parse message as JSON:', entry.message);
    }

    if (entry.raw) {
      try {
        const parsed = JSON.parse(entry.raw);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch {
        // Ignore parse errors
      }
    }

    return { content: entry.message };
  }, [entry.data, entry.message, entry.raw]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = useMemo(() => {
    const jsonString = JSON.stringify(parsedData, null, 2);
    return jsonString.split('\n').length;
  }, [parsedData]);

  return (
    <div className="log-detail-panel">
      <div className="log-detail-header">
        <div className="log-detail-title">
          <span className="log-label">Log</span>
          <span className="log-datetime">{formatDateTime(entry.dt)}</span>
        </div>
        <div className="log-detail-actions">
          <button className="detail-action-btn" title="Copy link">
            <Link size={16} />
          </button>
          <button className="detail-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="log-detail-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveTab('context')}
        >
          Context
        </button>
        <button
          className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
          Raw
        </button>
      </div>

      <div className="log-detail-content">
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="json-header">
              <span className="json-label">
                <span className="json-icon">{'{}'}</span> JSON
              </span>
              <div className="json-actions">
                <button
                  className="json-action-btn"
                  onClick={() => setExpandAll(!expandAll)}
                >
                  {expandAll ? 'Collapse all' : 'Expand all'}
                </button>
                <button className="json-action-btn" onClick={handleCopy}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="json-viewer-container">
              <div className="json-line-numbers">
                {Array.from({ length: lineCount }, (_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
              <div className="json-viewer">
                <JsonViewer data={parsedData} expanded={true} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'context' && (
          <div className="context-content">
            <div className="context-section">
              <h4>Metadata</h4>
              <div className="context-grid">
                <div className="context-item">
                  <span className="context-label">Timestamp</span>
                  <span className="context-value">{entry.dt}</span>
                </div>
                <div className="context-item">
                  <span className="context-label">Level</span>
                  <span className="context-value">{entry.level}</span>
                </div>
                {entry.pid && (
                  <div className="context-item">
                    <span className="context-label">PID</span>
                    <span className="context-value">{entry.pid}</span>
                  </div>
                )}
                {entry.hostname && (
                  <div className="context-item">
                    <span className="context-label">Hostname</span>
                    <span className="context-value">{entry.hostname}</span>
                  </div>
                )}
              </div>
            </div>
            {entry.data && (
              <div className="context-section">
                <h4>Additional Data</h4>
                <div className="json-viewer-container small">
                  <div className="json-viewer">
                    <JsonViewer data={entry.data} expanded={true} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="raw-content">
            <pre className="raw-log">{entry.raw || entry.message}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
