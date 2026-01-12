import React, { useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileLoad: (content: string, filename: string) => void;
  compact?: boolean;
  currentFileName?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileLoad, 
  compact = false,
  currentFileName 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileLoad(content, file.name);
    };
    reader.readAsText(file);
  }, [onFileLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [handleFile]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  // Compact mode for header - just a button
  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          onChange={handleInputChange}
          accept=".log,.txt,.json,.ndjson"
          className="file-input"
        />
        <button className="upload-btn-compact" onClick={handleClick}>
          <Upload size={16} />
          <span>Upload</span>
        </button>
      </>
    );
  }

  // Full dropzone for empty state
  return (
    <div
      className="file-upload-zone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        onChange={handleInputChange}
        accept=".log,.txt,.json,.ndjson"
        className="file-input"
      />
      <div className="file-upload-label">
        <Upload size={48} strokeWidth={1.5} />
        <div className="upload-text">
          <span className="upload-title">Drop your log file here</span>
          <span className="upload-subtitle">or click to browse</span>
        </div>
        <span className="upload-formats">Supports .log, .txt, .json, .ndjson files</span>
      </div>
    </div>
  );
};
