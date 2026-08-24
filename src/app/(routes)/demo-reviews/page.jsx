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

function readValue(v) {
  if (v === null || v === undefined) return "—";
  const text = String(v).trim();
  return text || "—";
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
                <div>
                  <p className="text-xs text-muted-foreground">Candidate Name</p>
                  <p className="font-medium">{readValue(selectedReview.candidate_name)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mobile</p>
                  <p className="font-medium">{readValue(selectedReview.mobile_no)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium break-words">{readValue(selectedReview.candidate_email)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Course / Batch</p>
                  <p className="font-medium">{readValue(selectedReview.course_batch)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Review Date</p>
                  <p className="font-medium">{readValue(selectedReview.review_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Review Source</p>
                  <p className="font-medium">{sourceBadgeMeta(selectedReview.review_source).label}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Referrer</p>
                  <p className="font-medium">
                    {readValue(
                      selectedReview.sales_person_name ||
                        selectedReview.referrer_mentor_name ||
                        selectedReview.lead
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reviewed By</p>
                  <p className="font-medium">{readValue(selectedReview.mentor_name)}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Communication</p>
                  <p className="font-medium">{readValue(selectedReview.communication_level)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Backend / Programming</p>
                  <p className="font-medium">{readValue(selectedReview.tech_languages_level)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Frontend</p>
                  <p className="font-medium">{readValue(selectedReview.frontend_level)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Overall Feedback</p>
                <p className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm">
                  {readValue(selectedReview.overall_feedback)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Suggestions</p>
                <p className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm">
                  {readValue(selectedReview.suggestions_general)}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">LinkedIn Active</p>
                  <p className="font-medium">{readValue(selectedReview.linkedin_active)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Jobs Applying</p>
                  <p className="font-medium">{readValue(selectedReview.jobs_applying)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">LinkedIn Suggestions</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm">
                    {readValue(selectedReview.linkedin_suggestions)}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Issues</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm">
                    {readValue(selectedReview.issues)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default withPrivateAuth(DemoReviewsPage);
