"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Image as ImageIcon,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  File,
} from "lucide-react";
import Image from "next/image";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type AllowedFileType =
  | "image"
  | "pdf"
  | "excel"
  | "word"
  | "document" // pdf + word + excel
  | "all"; // image + document

export interface ExistingFile {
  /** ชื่อไฟล์ที่จะแสดง */
  name: string;
  /** URL / path สำหรับดาวน์โหลด/ดูตัวอย่าง (optional) */
  url?: string;
}

export interface FileUploadProps {
  /** Label ที่จะแสดงเหนือ dropzone */
  label?: string;
  /** ข้อความเสริมใต้ label */
  description?: string;
  /** ประเภทไฟล์ที่อนุญาต */
  accept?: AllowedFileType;
  /** ขนาดสูงสุด (MB) – ค่าเริ่มต้น 20 MB */
  maxSizeMB?: number;
  /** อนุญาตให้เลือกหลายไฟล์พร้อมกัน */
  multiple?: boolean;
  /** ถ้ามีไฟล์เดิม (mode: update) จะแสดงเป็น badge */
  existingFile?: ExistingFile | null;
  /** callback เมื่อ files เปลี่ยน */
  onFilesChange?: (files: File[]) => void;
  /** callback เมื่อผู้ใช้กด "ลบไฟล์เดิม" */
  onExistingFileRemove?: () => void;
  /** ปิดการใช้งาน */
  disabled?: boolean;
  /** class เพิ่มเติม */
  className?: string;
  /** แสดง required asterisk */
  required?: boolean;
  // Main component File param
  setFilesOutside?: (files: File[]) => void;
  fileOutside?: File[]
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const ACCEPT_MAP: Record<AllowedFileType, string> = {
  image: "image/jpeg,image/png,image/gif,image/webp,image/svg+xml",
  pdf: "application/pdf",
  excel:
    "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  word: "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  document:
    "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  all: "image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const ACCEPT_LABEL_MAP: Record<AllowedFileType, string> = {
  image: "JPG, PNG, GIF, WEBP, SVG",
  pdf: "PDF",
  excel: "XLS, XLSX",
  word: "DOC, DOCX",
  document: "PDF, DOC, DOCX, XLS, XLSX",
  all: "JPG, PNG, PDF, DOC, DOCX, XLS, XLSX",
};

function parseAcceptedMime(accept: AllowedFileType): string[] {
  return ACCEPT_MAP[accept].split(",");
}

function isFileAccepted(file: File, accept: AllowedFileType): boolean {
  const accepted = parseAcceptedMime(accept);
  return accepted.some((mime) => {
    if (mime.endsWith("/*")) {
      return file.type.startsWith(mime.replace("/*", "/"));
    }
    return file.type === mime;
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(file: File) {
  const { type } = file;
  if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-blue-500" />;
  if (type === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  if (type.includes("spreadsheet") || type.includes("excel"))
    return <FileText className="h-5 w-5 text-green-600" />;
  if (type.includes("word") || type.includes("document"))
    return <FileText className="h-5 w-5 text-blue-600" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

// ─────────────────────────────────────────────
// Preview thumbnail for images
// ─────────────────────────────────────────────

function ImagePreview({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!src) return <ImageIcon className="h-5 w-5 text-blue-500" />;

  return (
    <Image
      src={src}
      alt={file.name}
      width={40}
      height={40}
      className="h-10 w-10 rounded object-cover border border-border"
    />
  );
}

// ─────────────────────────────────────────────
// FileItem row
// ─────────────────────────────────────────────

interface FileItemProps {
  file: File;
  onRemove: () => void;
  disabled?: boolean;
}

function FileItem({ file, onRemove, disabled }: FileItemProps) {
  const isImage = file.type.startsWith("image/");

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 transition-colors",
        "hover:bg-muted/70"
      )}
    >
      {/* Thumbnail / Icon */}
      <div className="flex-shrink-0">
        {isImage ? <ImagePreview file={file} /> : getFileIcon(file)}
      </div>

      {/* Name + Size */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
      </div>

      {/* Status icon */}
      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />

      {/* Remove */}
      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function FileUpload({
  label = "อัปโหลดไฟล์",
  description,
  accept = "all",
  maxSizeMB = 20,
  multiple = false,
  existingFile,
  onFilesChange,
  onExistingFileRemove,
  disabled = false,
  className,
  required = false,
  setFilesOutside
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  // Whether user has removed the existing file badge
  const [existingRemoved, setExistingRemoved] = useState(false);

  // Sync to parent
  useEffect(() => {
    onFilesChange?.(files);
  }, [files]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset existing-removed state when existingFile prop changes (e.g. form reset)
  useEffect(() => {
    setExistingRemoved(false);
  }, [existingFile]);

  const validateAndAdd = useCallback(
    (incoming: File[]) => {
      const maxBytes = maxSizeMB * 1024 * 1024;
      const newErrors: string[] = [];
      const valid: File[] = [];

      for (const f of incoming) {
        if (!isFileAccepted(f, accept)) {
          newErrors.push(`"${f.name}" ไม่ใช่ประเภทไฟล์ที่อนุญาต`);
          continue;
        }
        if (f.size > maxBytes) {
          newErrors.push(`"${f.name}" มีขนาดเกิน ${maxSizeMB} MB`);
          continue;
        }
        valid.push(f);
      }

      setErrors(newErrors);

      if (valid.length === 0) return;

      setFiles((prev) => {
        if (multiple) {
          // De-duplicate by name+size
          const merged = [...prev];
          for (const vf of valid) {
            const dup = merged.some((p) => p.name === vf.name && p.size === vf.size);
            if (!dup) merged.push(vf);
          }
          return merged;
        }
        // Single mode: replace
        return [valid[0]];
      });
    },
    [accept, maxSizeMB, multiple]
  );

  // Input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndAdd(Array.from(e.target.files));
    }
    // Reset so same file can be selected again
    e.target.value = "";
  };

  // Drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    validateAndAdd(Array.from(e.dataTransfer.files));
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExisting = () => {
    setExistingRemoved(true);
    onExistingFileRemove?.();
  };

  const showExisting = existingFile && !existingRemoved && files.length === 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>

      {/* Description */}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      {/* Existing file badge (update mode) */}
      {showExisting && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5">
          <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-primary">
              {existingFile.name}
            </p>
            <p className="text-xs text-muted-foreground">ไฟล์ปัจจุบัน</p>
          </div>
          {existingFile.url && (
            <a
              href={existingFile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              ดู
            </a>
          )}
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
              onClick={handleRemoveExisting}
              aria-label="Remove existing file"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Drop zone — shown when no existing file (or existing removed) */}
      {!showExisting && (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="File drop zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200 outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isDragging
              ? "border-primary bg-primary/8 scale-[1.01]"
              : "border-border hover:border-primary/60 hover:bg-muted/50",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          {/* Upload icon */}
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
              isDragging ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            <Upload className="h-5 w-5" />
          </div>

          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {isDragging ? (
                "วางไฟล์ที่นี่…"
              ) : (
                <>
                  <span className="text-primary">คลิกเพื่อเลือก</span> หรือลากไฟล์มาวาง
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {ACCEPT_LABEL_MAP[accept]} · สูงสุด {maxSizeMB} MB
              {multiple && " · เลือกได้หลายไฟล์"}
            </p>
          </div>

          {/* Hidden input */}
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept={ACCEPT_MAP[accept]}
            multiple={multiple}
            onChange={handleInputChange}
            disabled={disabled}
            aria-hidden
          />
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2" aria-label="Selected files">
          {files.map((file, i) => (
            <li key={`${file.name}-${file.size}-${i}`}>
              <FileItem
                file={file}
                onRemove={() => handleRemoveFile(i)}
                disabled={disabled}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <ul className="space-y-1" role="alert" aria-live="polite">
          {errors.map((err, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FileUpload;
