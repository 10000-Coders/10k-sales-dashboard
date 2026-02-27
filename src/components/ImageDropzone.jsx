"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Upload, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Trendy drag-and-drop (or click) image upload. Optional receipt/screenshot for payments.
 * @param {Object} props
 * @param {File | null} props.value - Selected file
 * @param {function(File | null): void} props.onChange - Called when file changes
 * @param {string} [props.label] - Label text
 * @param {string} [props.placeholder] - Text when empty
 * @param {string} [props.className] - Extra classes for container
 */
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function ImageDropzone({ value, onChange, label = "Receipt / screenshot", placeholder = "Drag & drop an image here, or click to browse", className }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileError, setFileError] = useState(null);

  useEffect(() => {
    if (!value) {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setFileError(null);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (file) => {
    setFileError(null);
    if (!file) {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      onChange(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setFileError("Please select an image file.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setFileError("File must be 5MB or less.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    onChange(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <p className="text-sm font-medium text-foreground">{label}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {value ? (
        <div
          className={cn(
            "relative flex items-center gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20 p-4 transition-all"
          )}
        >
          <div className="flex h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-emerald-200 bg-white dark:border-emerald-800">
            {preview ? (
              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-emerald-500">
                <ImageIcon className="h-7 w-7" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{value.name}</p>
            <p className="text-xs text-muted-foreground">
              {(value.size / 1024).toFixed(1)} KB · Click or drop to replace
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex-shrink-0 rounded-full text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
            onClick={handleRemove}
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition-all duration-200",
            "border-slate-300 bg-slate-50/50 hover:border-emerald-400 hover:bg-emerald-50/30 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
            isDragging && "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/30"
          )}
        >
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
              isDragging ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
            )}
          >
            <Upload className="h-6 w-6" />
          </div>
          <span className="text-center text-sm font-medium text-slate-600 dark:text-slate-400">
            {placeholder}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-500">
            PNG, JPG or WebP · max 5MB
          </span>
          {fileError && (
            <span className="text-xs text-red-600 dark:text-red-400">{fileError}</span>
          )}
        </button>
      )}
    </div>
  );
}
