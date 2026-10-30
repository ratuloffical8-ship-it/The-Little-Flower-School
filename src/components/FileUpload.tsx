// src/components/FileUpload.tsx
import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from 'react';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { validateFile, MAX_DOC_SIZE, ALLOWED_DOC_TYPES } from '@/utils/validation';
import { formatFileSize } from '@/utils/format';

/* ── Types ── */

interface FileUploadProps {
  /** Multi-file mode: currently selected files. onChange receives File[] */
  files?: File[];
  /** Single-file mode: currently selected file. onChange receives File | null */
  value?: File | null;
  /** Called when the selection changes (File[] in multi mode, File | null in single mode) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (value: any) => void;
  /** Maximum number of files in multi mode (default 1) */
  maxFiles?: number;
  /** Maximum file size. Values up to 1024 are treated as MB, larger values as bytes */
  maxSize?: number;
  /** Allowed MIME types (derived from `accept` when omitted) */
  acceptedTypes?: string[];
  /** Accept attribute for the file input (e.g. "image/jpeg,image/png") */
  accept?: string;
  label?: string;
  /** Small helper text under the drop zone */
  hint?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

/* ── Helpers ── */

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return <ImageIcon size={16} />;
  if (file.type === 'application/pdf') return <FileText size={16} />;
  return <FileIcon size={16} />;
}

function typesFromAccept(accept?: string): string[] | null {
  if (!accept) return null;
  const list = accept
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.includes('/') && !s.endsWith('/*'));
  return list.length > 0 ? list : null;
}

/* ── Component ── */

export default function FileUpload({
  files,
  value,
  onChange,
  maxFiles = 1,
  maxSize = MAX_DOC_SIZE,
  acceptedTypes,
  accept,
  label,
  hint,
  required = false,
  error: externalError,
  disabled = false,
}: FileUploadProps) {
  const { t, isBengali } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isMulti = files !== undefined;
  const current: File[] = isMulti ? (files as File[]) : value ? [value] : [];
  const limit = isMulti ? maxFiles : 1;

  const maxBytes = maxSize <= 1024 ? maxSize * 1024 * 1024 : maxSize;
  const allowed: string[] =
    acceptedTypes ?? typesFromAccept(accept) ?? (ALLOWED_DOC_TYPES as string[]);

  const error = externalError || localError;

  const processFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setLocalError(null);
      const fileArray = Array.from(newFiles);
      if (fileArray.length === 0) return;

      if (isMulti && current.length + fileArray.length > limit) {
        setLocalError(
          isBengali
            ? `সর্বোচ্চ ${limit}টি ফাইল আপলোড করা যাবে`
            : `Maximum ${limit} file(s) allowed`,
        );
        return;
      }

      const toCheck = isMulti ? fileArray : [fileArray[0]];
      for (const file of toCheck) {
        const validationError = validateFile(file, {
          required: true,
          maxSize: maxBytes,
          allowedTypes: allowed,
        });
        if (validationError) {
          setLocalError(validationError);
          return;
        }
      }

      if (isMulti) {
        onChange([...current, ...fileArray]);
      } else {
        onChange(fileArray[0]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, isMulti, limit, maxBytes, allowed, onChange, isBengali],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset so the same file can be selected again
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
    setLocalError(null);
    if (isMulti) {
      onChange(current.filter((_, i) => i !== index));
    } else {
      onChange(null);
    }
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
          {isBengali ? 'ফাইল টেনে আনুন বা ক্লিক করুন' : 'Drag & drop or click to upload'}
        </p>
        <p className="text-xs text-ink-light/60">
          {allowed.includes('application/pdf') ? 'JPG, PNG, WebP, PDF' : 'JPG, PNG, WebP'}
          {' · '}
          {formatFileSize(maxBytes)} {isBengali ? 'পর্যন্ত' : 'max'}
        </p>
        {hint && <p className="text-xs text-ink-light/70">{hint}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept || allowed.join(',')}
        multiple={isMulti && limit > 1}
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
      {current.length > 0 && (
        <ul className="space-y-1.5">
          {current.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm"
            >
              <span className="text-ink-light">{getFileIcon(file)}</span>
              <span className="flex-1 truncate text-ink">{file.name}</span>
              <span className="text-xs text-ink-light">{formatFileSize(file.size)}</span>
              <button
                type="button"
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
