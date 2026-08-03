"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportProductivityPdf } from "@/features/activities/exportProductivityPdf";

/** Single-click PDF download: table + charts. */
export function DownloadProductivityPdfButton({
  from,
  to,
  salesPersonId,
  salesPersonIds = [],
  headers = {},
  disabled = false,
  className,
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const runExport = async () => {
    if (!from || !to || exporting) return;
    setError("");
    setExporting(true);
    try {
      await exportProductivityPdf({
        from,
        to,
        salesPersonId,
        salesPersonIds,
        includeCharts: true,
        headers,
      });
    } catch (err) {
      setError(err?.message || "PDF export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={cn(className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || exporting || !from || !to}
        onClick={runExport}
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Download PDF
      </Button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
