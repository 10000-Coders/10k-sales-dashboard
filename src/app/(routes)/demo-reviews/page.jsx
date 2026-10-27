"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "@/axios";
import withPrivateAuth from "@/components/withPrivateAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, ClipboardList } from "lucide-react";

function sourceBadgeMeta(source) {
  if (source === "student_batch_review") {
    return { label: "Batch Student", className: "bg-indigo-100 text-indigo-700" };
  }
  return { label: "Demo", className: "bg-emerald-100 text-emerald-700" };
}

function hasContent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  const text = String(value).trim();
  return text !== "";
}

function readValue(v) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  if (Array.isArray(v)) {
    const joined = v.map((item) => String(item).trim()).filter(Boolean).join(", ");
    return joined || "—";
  }
  if (v === null || v === undefined) return "—";
  const text = String(v).trim();
  return text || "—";
}

function Field({ label, value, className = "" }) {
  if (!hasContent(value)) return null;
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap break-words font-medium">{readValue(value)}</p>
    </div>
  );
}

function LevelBlock({ label, level, suggestions }) {
  if (!hasContent(level) && !hasContent(suggestions)) return null;
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-12">
        {hasContent(level) ? (
          <div className={hasContent(suggestions) ? "sm:col-span-2" : "sm:col-span-12"}>
            <p className="text-xs text-muted-foreground">Level</p>
            <p className="font-medium">{readValue(level)}</p>
          </div>
        ) : null}
        {hasContent(suggestions) ? (
          <div className={hasContent(level) ? "sm:col-span-10" : "sm:col-span-12"}>
            <p className="text-xs text-muted-foreground">Suggestions</p>
            <p className="whitespace-pre-wrap text-sm">{readValue(suggestions)}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TechBlock({ title, techs, level, suggestions }) {
  if (!hasContent(techs) && !hasContent(level) && !hasContent(suggestions)) return null;
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-sm font-semibold">{title}</p>
      {hasContent(techs) ? (
        <p className="mt-2 text-sm">{readValue(techs)}</p>
      ) : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-12">
        {hasContent(level) ? (
          <div className={hasContent(suggestions) ? "sm:col-span-2" : "sm:col-span-12"}>
            <p className="text-xs text-muted-foreground">Level</p>
            <p className="font-medium">{readValue(level)}</p>
          </div>
        ) : null}
        {hasContent(suggestions) ? (
          <div className={hasContent(level) ? "sm:col-span-10" : "sm:col-span-12"}>
            <p className="text-xs text-muted-foreground">Suggestions</p>
            <p className="whitespace-pre-wrap text-sm">{readValue(suggestions)}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CustomEvalItems({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const rows = items.filter((item) => item && (item.title || item.level || item.suggestions));
  if (!rows.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Custom evaluation</p>
      {rows.map((item, idx) => (
        <LevelBlock
          key={`${item.title || "item"}-${idx}`}
          label={item.title || `Item ${idx + 1}`}
          level={item.level}
          suggestions={item.suggestions}
        />
      ))}
    </div>
  );
}

function DemoReviewsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [onlyMyReferrals, setOnlyMyReferrals] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [meta, setMeta] = useState({ total_count: 0, page: 1, page_size: 25, total_pages: 0 });
  const [selectedReview, setSelectedReview] = useState(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchDebounce.trim()) params.set("search", searchDebounce.trim());
      if (onlyMyReferrals) params.set("only_my_referrals", "1");
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      const { data } = await axios.get(`/demo-reviews/?${params.toString()}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setMeta(data?.metadata || { total_count: 0, page: 1, page_size: pageSize, total_pages: 0 });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load demo reviews.");
      setItems([]);
      setMeta({ total_count: 0, page: 1, page_size: pageSize, total_pages: 0 });
    } finally {
      setLoading(false);
    }
  }, [searchDebounce, onlyMyReferrals, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 3000);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounce, onlyMyReferrals, pageSize]);

  const canPrev = (meta.page || 1) > 1;
  const canNext = (meta.page || 1) < (meta.total_pages || 1);

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <ClipboardList className="h-6 w-6" />
                Demo reviews
              </CardTitle>
              <CardDescription>
                View-only list for sales. Search by candidate name, email, or mobile. Use "My referrals" to see only reviews referred by you.
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{meta.total_count ?? 0}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or mobile..."
                className="h-9 pl-9"
              />
            </div>
            <Button
              type="button"
              variant={onlyMyReferrals ? "default" : "outline"}
              className="h-9"
              onClick={() => setOnlyMyReferrals((v) => !v)}
            >
              My referrals
            </Button>
            <select
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No demo reviews found for the selected filter.</p>
          ) : (
            <div className="w-full min-w-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Reviewed by</TableHead>
                    <TableHead>Review date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((review) => {
                    const source = sourceBadgeMeta(review.review_source);
                    const referrerLabel =
                      review.sales_person_name ||
                      review.referrer_mentor_name ||
                      review.lead ||
                      "—";
                    return (
                      <TableRow
                        key={review.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedReview(review)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{review.candidate_name || "—"}</span>
                            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${source.className}`}>
                              {source.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="break-words">{review.mobile_no || "—"}</div>
                          <div className="break-words text-xs">{review.candidate_email || "—"}</div>
                          {review.course_batch ? <div className="break-words text-xs">Batch: {review.course_batch}</div> : null}
                        </TableCell>
                        <TableCell className="break-words">{referrerLabel}</TableCell>
                        <TableCell className="break-words">{review.mentor_name || "—"}</TableCell>
                        <TableCell>{review.review_date || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && !error ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{meta.page || 1}</span> of{" "}
                <span className="font-medium text-foreground">{meta.total_pages || 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  disabled={!canPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  disabled={!canNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      {selectedReview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedReview(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold">Demo Review Details</h3>
                <p className="text-sm text-muted-foreground">Review ID: {selectedReview.id}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setSelectedReview(null)}>
                Close
              </Button>
            </div>
            <div className="grid gap-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Candidate Name" value={selectedReview.candidate_name} />
                <Field label="Mobile" value={selectedReview.mobile_no} />
                <Field label="Email" value={selectedReview.candidate_email} />
                <Field label="Course / Batch" value={selectedReview.course_batch} />
                <Field label="Batch no" value={selectedReview.batch_no} />
                <Field label="Review Date" value={selectedReview.review_date} />
                <Field label="Created at" value={selectedReview.created_at} />
                <Field label="Review Source" value={sourceBadgeMeta(selectedReview.review_source).label} />
                <Field label="Ready to placement" value={selectedReview.ready_to_placement} />
                <Field label="Native place" value={selectedReview.native_place} />
                <Field label="Passed out year / branch" value={selectedReview.passed_out_year_branch} />
                <Field
                  label="Referrer (sales)"
                  value={
                    selectedReview.sales_person_name
                      ? `${selectedReview.sales_person_name}${selectedReview.sales_person_email ? ` (${selectedReview.sales_person_email})` : ""}`
                      : null
                  }
                />
                <Field
                  label="Referrer (mentor)"
                  value={
                    selectedReview.referrer_mentor_name
                      ? `${selectedReview.referrer_mentor_name}${selectedReview.referrer_mentor_role_type ? ` · ${selectedReview.referrer_mentor_role_type}` : ""}`
                      : null
                  }
                />
                <Field label="Lead (free text)" value={selectedReview.lead} />
                <Field
                  label="Reviewed By"
                  value={
                    selectedReview.mentor_name
                      ? `${selectedReview.mentor_name}${selectedReview.reviewed_by_email ? ` (${selectedReview.reviewed_by_email})` : ""}`
                      : null
                  }
                />
                <Field
                  label="Linked student"
                  value={
                    selectedReview.student_name
                      ? `${selectedReview.student_name}${selectedReview.student_email ? ` (${selectedReview.student_email})` : ""}`
                      : null
                  }
                />
              </div>

              <div className="space-y-2">
                <LevelBlock
                  label="Communication"
                  level={selectedReview.communication_level}
                  suggestions={selectedReview.communication_suggestions}
                />
                <TechBlock
                  title="Backend / Programming"
                  techs={selectedReview.tech_languages}
                  level={selectedReview.tech_languages_level}
                  suggestions={selectedReview.tech_languages_suggestions}
                />
                <TechBlock
                  title="Frontend"
                  techs={selectedReview.frontend_techs}
                  level={selectedReview.frontend_level}
                  suggestions={selectedReview.frontend_suggestions}
                />
                <LevelBlock
                  label="Problem solving"
                  level={selectedReview.problem_solving_level}
                  suggestions={selectedReview.problem_solving_suggestions}
                />
                <LevelBlock
                  label="Database"
                  level={selectedReview.database_level}
                  suggestions={selectedReview.database_suggestions}
                />
                <LevelBlock
                  label="Deployment"
                  level={selectedReview.deployment_level}
                  suggestions={selectedReview.deployment_suggestions}
                />
                <LevelBlock
                  label="Aptitude"
                  level={selectedReview.aptitude_level}
                  suggestions={selectedReview.aptitude_suggestions}
                />
                <LevelBlock
                  label="Power BI"
                  level={selectedReview.power_bi_level}
                  suggestions={selectedReview.power_bi_suggestions}
                />
                <LevelBlock
                  label="SQL analytics"
                  level={selectedReview.sql_analytics_level}
                  suggestions={selectedReview.sql_analytics_suggestions}
                />
                <LevelBlock
                  label="Excel reporting"
                  level={selectedReview.excel_reporting_level}
                  suggestions={selectedReview.excel_reporting_suggestions}
                />
                <LevelBlock
                  label="Data viz / storytelling"
                  level={selectedReview.data_viz_storytelling_level}
                  suggestions={selectedReview.data_viz_storytelling_suggestions}
                />
                <CustomEvalItems items={selectedReview.custom_evaluation_items} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="LinkedIn Active" value={selectedReview.linkedin_active} />
                <Field label="Jobs Applying" value={selectedReview.jobs_applying} />
                <Field label="Resume rating" value={selectedReview.resume_rating} className="sm:col-span-2" />
                <Field label="LinkedIn Suggestions" value={selectedReview.linkedin_suggestions} className="sm:col-span-2" />
                <Field label="Background" value={selectedReview.background} className="sm:col-span-2" />
                <Field label="Previous interview feedback" value={selectedReview.previous_interview_feedback} className="sm:col-span-2" />
                <Field label="Overall Feedback" value={selectedReview.overall_feedback} className="sm:col-span-2" />
                <Field label="Suggestions" value={selectedReview.suggestions_general} className="sm:col-span-2" />
                <Field label="Issues" value={selectedReview.issues} className="sm:col-span-2" />
                <Field label="Follow-up task" value={selectedReview.follow_up_task} className="sm:col-span-2" />
                <Field label="Concepts to learn" value={selectedReview.concepts_to_learn} className="sm:col-span-2" />
                <Field label="Follow-up deadline" value={selectedReview.follow_up_deadline} />
                <Field label="Follow-up submission link" value={selectedReview.follow_up_submission_link} />
                <Field label="Follow-up submitted at" value={selectedReview.follow_up_submitted_at} />
                <Field label="Concepts acknowledged at" value={selectedReview.concepts_acknowledged_at} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default withPrivateAuth(DemoReviewsPage);
