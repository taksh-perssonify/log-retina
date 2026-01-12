import React, { useMemo } from 'react';
import { LogEntry, LogLevel, TimelineBucket } from '../types/log';
import { format } from 'date-fns';

interface TimelineProps {
  entries: LogEntry[];
  onRangeSelect?: (start: Date, end: Date) => void;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#6b7280',
  info: '#3b82f6',
  warn: '#f59e0b',
  error: '#ef4444',
  fatal: '#dc2626'
};

export const Timeline: React.FC<TimelineProps> = ({ entries }) => {
  const buckets = useMemo(() => {
    if (entries.length === 0) return [];

    // Get date range
    const dates = entries.map(e => new Date(e.dt).getTime()).filter(d => !isNaN(d));
    if (dates.length === 0) return [];

    const minTime = Math.min(...dates);
    const maxTime = Math.max(...dates);
    const range = maxTime - minTime;

    // Determine bucket size (aim for ~50-100 buckets)
    const numBuckets = Math.min(100, Math.max(20, entries.length / 10));
    const bucketSize = range / numBuckets || 1;

    // Create buckets
    const bucketMap = new Map<number, TimelineBucket>();

    for (const entry of entries) {
      const time = new Date(entry.dt).getTime();
      if (isNaN(time)) continue;

      const bucketIndex = Math.floor((time - minTime) / bucketSize);
      const bucketTime = minTime + bucketIndex * bucketSize;

      if (!bucketMap.has(bucketIndex)) {
        bucketMap.set(bucketIndex, {
          timestamp: new Date(bucketTime),
          count: 0,
          byLevel: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 }
        });
      }

      const bucket = bucketMap.get(bucketIndex)!;
      bucket.count++;
      bucket.byLevel[entry.level]++;
    }

    return Array.from(bucketMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, bucket]) => bucket);
  }, [entries]);

  const maxCount = useMemo(() => {
    return Math.max(...buckets.map(b => b.count), 1);
  }, [buckets]);

  const dateRange = useMemo(() => {
    if (buckets.length === 0) return null;
    return {
      start: buckets[0].timestamp,
      end: buckets[buckets.length - 1].timestamp
    };
  }, [buckets]);

  if (buckets.length === 0) {
    return (
      <div className="timeline-container">
        <div className="timeline-empty">No timeline data available</div>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <div className="timeline-chart">
        <div className="timeline-y-axis">
          <span>{maxCount}</span>
          <span>{Math.floor(maxCount / 2)}</span>
          <span>0</span>
        </div>
        <div className="timeline-bars">
          {buckets.map((bucket, index) => {
            const heightPercent = (bucket.count / maxCount) * 100;
            const levels: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug'];
            
            return (
              <div
                key={index}
                className="timeline-bar-container"
                title={`${format(bucket.timestamp, 'MMM d, yyyy HH:mm')} - ${bucket.count} logs`}
              >
                <div className="timeline-bar" style={{ height: `${heightPercent}%` }}>
                  {levels.map(level => {
                    const levelCount = bucket.byLevel[level];
                    if (levelCount === 0) return null;
                    const levelPercent = (levelCount / bucket.count) * 100;
                    return (
                      <div
                        key={level}
                        className="timeline-bar-segment"
                        style={{
                          height: `${levelPercent}%`,
                          backgroundColor: LEVEL_COLORS[level]
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {dateRange && (
        <div className="timeline-x-axis">
          <span>{format(dateRange.start, 'MMM d, yyyy')}</span>
          <span>{format(dateRange.end, 'MMM d, yyyy')}</span>
        </div>
      )}
    </div>
  );
};

