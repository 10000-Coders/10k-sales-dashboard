"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import DemoStudentFeedbackModal from "@/components/demoStudents/DemoStudentFeedbackModal";

const TH = "h-9 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
const TD = "px-2 py-2 text-xs align-top";

export default function DemoStudentsTable({
  list,
  listMeta,
  loading,
  error,
  toolbar = null,
  showCheckboxes = false,
  selectedIds = [],
  onToggleAll,
  onToggleOne,
  onPrev,
  onNext,
  appliedFilters = {},
}) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const page = listMeta.page || 1;
  const totalPages = listMeta.total_pages || 1;
  const pageSize = listMeta.page_size || 30;
  const totalCount = listMeta.count ?? 0;
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <Card className="min-w-0">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">Students</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{listMeta.count ?? 0}</span>
          </p>
        </div>
        {toolbar}
      </CardHeader>
      <CardContent className="min-w-0">
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No demo students found</p>
            <p className="text-xs text-muted-foreground">Try a different search or clear filters</p>
          </div>
        ) : (
          <div className="w-full min-w-0 overflow-x-auto rounded-md border border-border/60">
            <Table className="w-full min-w-[720px] table-fixed text-xs leading-tight">
              <TableHeader>
                <TableRow className="border-b bg-muted/30 hover:bg-transparent">
                  {showCheckboxes && <TableHead className={cn(TH, "w-9")} />}
                  <TableHead className={cn(TH, "w-[14%]")}>Name</TableHead>
                  <TableHead className={cn(TH, "w-[20%]")}>Phone / Email</TableHead>
                  <TableHead className={cn(TH, "w-[16%]")}>Course / Trainer</TableHead>
                  <TableHead className={cn(TH, "w-[14%]")}>Topic</TableHead>
                  <TableHead className={cn(TH, "w-[8%] text-center")}>Feedbacks</TableHead>
                  <TableHead className={cn(TH, "w-[12%]")}>Status / Payment</TableHead>
                  <TableHead className={cn(TH, "w-[10%]")}>Sales person</TableHead>
                  <TableHead className={cn(TH, "w-[8%]")}>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/40"
                    onClick={() => setSelectedStudent(s)}
                  >
                    {showCheckboxes && (
                      <TableCell className={TD} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(s.id)}
                          onChange={() => onToggleOne(s.id)}
                          aria-label={`Select ${s.student_name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className={cn(TD, "font-medium text-primary")}>
                      <span className="block truncate underline-offset-2 hover:underline" title={s.student_name}>
                        {s.student_name}
                      </span>
                    </TableCell>
                    <TableCell className={cn(TD, "text-muted-foreground")}>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {s.student_phonenumber ? (
                          <span className="inline-flex min-w-0 items-center gap-1" title={s.student_phonenumber}>
                            <Phone className="h-3 w-3 shrink-0 opacity-70" />
                            <span className="truncate">{s.student_phonenumber}</span>
                          </span>
                        ) : null}
                        {s.student_email ? (
                          <span className="inline-flex min-w-0 items-center gap-1" title={s.student_email}>
                            <Mail className="h-3 w-3 shrink-0 opacity-70" />
                            <span className="truncate">{s.student_email}</span>
                          </span>
                        ) : null}
                        {!s.student_phonenumber && !s.student_email ? "—" : null}
                      </div>
                    </TableCell>
                    <TableCell className={TD}>
                      <div className="min-w-0">
                        <p className="truncate font-medium" title={s.latest_feedback?.course_name || ""}>
                          {s.latest_feedback?.course_name || "—"}
                        </p>
                        <p
                          className="truncate text-[11px] text-muted-foreground"
                          title={s.latest_feedback?.demo_trainer_name || ""}
                        >
                          {s.latest_feedback?.demo_trainer_name || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className={TD}>
                      <span className="block truncate" title={s.latest_feedback?.demo_topic || ""}>
                        {s.latest_feedback?.demo_topic || "—"}
                      </span>
                    </TableCell>
                    <TableCell className={cn(TD, "text-center")}>
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        {s.feedback_count ?? s.feedbacks?.length ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className={TD}>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.student_status || "—"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.payment_status ? "Paid" : "Unpaid"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className={TD}>
                      <span className="block truncate" title={s.sales_person_display || ""}>
                        {s.sales_person_display || "—"}
                      </span>
                    </TableCell>
                    <TableCell className={cn(TD, "whitespace-nowrap text-muted-foreground")}>
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {totalCount === 0
              ? "No results"
              : `Showing ${rangeStart}–${rangeEnd} of ${totalCount} · Page ${page} of ${totalPages}`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canPrev || loading}
              onClick={onPrev}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canNext || loading}
              onClick={onNext}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>

      <DemoStudentFeedbackModal
        open={Boolean(selectedStudent)}
        studentId={selectedStudent?.id}
        studentPreview={selectedStudent}
        appliedFilters={appliedFilters}
        onClose={() => setSelectedStudent(null)}
      />
    </Card>
  );
}
