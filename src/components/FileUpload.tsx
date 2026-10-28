// src/components/FileUpload.tsx
import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from 'react';
import { Upload, X, FileText, Image as ImageIcon, File, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { validateFile, MAX_DOC_SIZE, ALLOWED_DOC_TYPES } from '@/utils/validation';
import { formatFileSize } from '@/utils/format';

/* ── Types ── */

interface FileUploadProps {
  /** Currently selected file(s) */
  files: File[];
  /** Called when files change */
  onChange: (files: File[]) => void;
  /** Maximum number of files (default 1) */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allowed MIME types */
  acceptedTypes?: string[];
  /** Accept attribute for file input (e.g., "image/*,.pdf") */
  accept?: string;
  /** Label text */
  label?: string;
  /** Is this field required? */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
}

/* ── Helpers ── */

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return <ImageIcon size={16} />;
  if (file.type === 'application/pdf') return <FileText size={16} />;
  return <File size={16} />;
}

/* ── Component ── */

export default function FileUpload({
  files,
  onChange,
  maxFiles = 1,
  maxSize = MAX_DOC_SIZE,
  acceptedTypes = ALLOWED_DOC_TYPES,
  accept,
  label,
  required = false,
  error: externalError,
  disabled = false,
}: FileUploadProps) {
  const { t, isBengali } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = externalError || localError;

  const processFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setLocalError(null);

      const fileArray = Array.from(newFiles);

      // Check total count
      if (files.length + fileArray.length > maxFiles) {
        setLocalError(
          isBengali
            ? `সর্বোচ্চ ${maxFiles}টি ফাইল আপলোড করা যাবে`
            : `Maximum ${maxFiles} file(s) allowed`,
        );
        return;
      }

      // Validate each file
      for (const file of fileArray) {
        const validationError = validateFile(file, {
          required: true,
          maxSize,
          allowedTypes: acceptedTypes,
        });
        if (validationError) {
          setLocalError(validationError);
          return;
        }
      }

      onChange([...files, ...fileArray]);
    },
    [files, maxFiles, maxSize, acceptedTypes, onChange, isBengali],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
    setLocalError(null);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="label">
          {label}
          {required && <span className="ml-1 text-error">*</span>}
        </label>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          disabled
            ? 'cursor-not-allowed border-border bg-surface text-ink-light/50'
            : isDragging
              ? 'border-royal bg-royal/5 text-royal'
              : error
                ? 'border-error bg-error/5 text-error'
                : 'border-border bg-white text-ink-light hover:border-royal hover:bg-royal/5'
        }`}
        role="button"
        tabIndex={0}
        aria-label={label || t('common.upload')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <Upload size={28} className={isDragging ? 'text-royal' : 'text-ink-light/40'} />
        <p className="text-sm">
          {isBengali
            ? 'ফাইল টেনে আনুন বা ক্লিক করুন'
            : 'Drag & drop or click to upload'}
        </p>
        <p className="text-xs text-ink-light/60">
          {acceptedTypes.includes('application/pdf')
            ? 'JPG, PNG, WebP, PDF'
            : 'JPG, PNG, WebP'}
          {' · '}
          {formatFileSize(maxSize)} {isBengali ? 'পর্যন্ত' : 'max'}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept || acceptedTypes.join(',')}
        multiple={maxFiles > 1}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1 text-xs text-error">
          <AlertCircle size={12} />
          {error}
        </p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm"
            >
              <span className="text-ink-light">{getFileIcon(file)}</span>
              <span className="flex-1 truncate text-ink">{file.name}</span>
              <span className="text-xs text-ink-light">
                {formatFileSize(file.size)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="rounded p-1 text-ink-light transition-colors hover:bg-error/10 hover:text-error"
                aria-label={t('common.delete')}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
         }
