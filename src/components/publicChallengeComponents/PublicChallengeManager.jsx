"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Trophy,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  BarChart3,
  Search,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  fetchPublicChallenges,
  deletePublicChallenge,
  clearErrors,
  fetchParticipantSubmissions,
} from "@/redux/features/publicChallenges/publicChallengeSlice";
import useToast from "@/hooks/useToast";
import PublicChallengeModal from "./PublicChallengeModal";
import CopyChallengeLinkModal from "./CopyChallengeLinkModal";
import LeaderboardModal from "@/components/challengeManagement/components/LeaderboardModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SCHOLARSHIP_TEST_NAV_LABEL } from "@/shared/static/sidebarItems";

const PAGE_SIZE = 20;
/** Share-to-scholarship-app is only valid for this challenge type. */
const SCHOLARSHIP_SHARE_TYPE = "COLLEGE_STUDENTS";

const PublicChallengeManager = () => {
  const dispatch = useDispatch();
  const { showSuccessToast, showErrorToast } = useToast();

  const challenges = useSelector((state) => state.publicChallenges.allChallenges || []);
  const challengesListMeta = useSelector(
    (state) => state.publicChallenges.challengesListMeta
  );
  const { participantSubmissions, submissionsLoading } = useSelector(
    (state) => state.publicChallenges
  );
  const loading = useSelector((state) => state.publicChallenges.getLoading || false);
  const deleteLoading = useSelector((state) => state.publicChallenges.deleteLoading || false);
  const error = useSelector((state) => state.publicChallenges.error);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showCopyLinkModal, setShowCopyLinkModal] = useState(false);
  const [copyLinkChallenge, setCopyLinkChallenge] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [expandedEntryId, setExpandedEntryId] = useState(null);

  const prevFiltersRef = useRef({ s: "", f: "", t: "" });
  useEffect(() => {
    const filtersChanged =
      prevFiltersRef.current.s !== debouncedSearch ||
      prevFiltersRef.current.f !== dateFrom ||
      prevFiltersRef.current.t !== dateTo;
    prevFiltersRef.current = { s: debouncedSearch, f: dateFrom, t: dateTo };

    if (filtersChanged && page !== 1) {
      setPage(1);
      return;
    }

    dispatch(
      fetchPublicChallenges({
        search: debouncedSearch,
        start_date: dateFrom,
        end_date: dateTo,
        page,
        page_size: PAGE_SIZE,
        challenge_type: SCHOLARSHIP_SHARE_TYPE,
      })
    );
  }, [dispatch, debouncedSearch, dateFrom, dateTo, page]);

  const hasActiveFilters = Boolean(searchInput.trim() || dateFrom || dateTo);
  const totalCount = challengesListMeta?.count ?? challenges.length;
  const totalPages = Math.max(1, challengesListMeta?.total_pages ?? 1);

  useEffect(() => {
    if (error) {
      showErrorToast(error?.message || "An error occurred");
      dispatch(clearErrors());
    }
  }, [error, showErrorToast, dispatch]);

  const handleCreate = () => {
    setSelectedChallenge(null);
    setShowModal(true);
  };

  const handleEdit = (challenge) => {
    setSelectedChallenge(challenge);
    setShowModal(true);
  };

  const transformedLeaderboardData = useMemo(() => {
    if (!participantSubmissions || participantSubmissions.length === 0) return [];

    return participantSubmissions.map((sub, index) => {
      const problemDetails =
        sub.code_submissions?.map((codeSub) => ({
          problem_id: codeSub.problem,
          problem_title: codeSub.problem_title,
          problem_difficulty: "MEDIUM",
          points: codeSub.points_earned,
          solved_at: codeSub.finished_at || codeSub.submitted_at,
          time_ms: codeSub.time_ms_total,
          memory_kb: codeSub.memory_kb_peak,
          source_code: codeSub.source_code,
          verdict: codeSub.verdict,
        })) || [];

      const mcqDetails =
        sub.mcq_submissions?.map((mcqSub) => ({
          question_id: mcqSub.question,
          question_text: mcqSub.question_text,
          question_type: mcqSub.question_type,
          points: mcqSub.points_earned,
          submitted_at: mcqSub.submitted_at,
          is_correct: mcqSub.is_correct,
          selected_option: mcqSub.selected_option_text,
          text_answer: mcqSub.text_answer,
          correct_answer: mcqSub.correct_option_text || mcqSub.correct_answer,
        })) || [];

      const uniqueCodingSolved = new Set(
        sub.code_submissions?.filter((s) => s.verdict === "AC").map((s) => s.problem)
      ).size;

      const mcqSolved = sub.mcq_submissions?.filter((s) => s.is_correct).length || 0;

      return {
        id: sub.user_id,
        rank: index + 1,
        student_name: sub.user_name,
        student_email: sub.user_email,
        user_phone: sub.user_phone,
        student_batch_name: "Public",
        total_points: sub.total_points,
        points: sub.total_points,
        coding_points: sub.code_points,
        mcq_points: sub.mcq_points,
        problems_solved: uniqueCodingSolved,
        mcq_solved: mcqSolved,
        solved: uniqueCodingSolved,
        total_problems: selectedChallenge?.problems_count || 0,
        problem_details: problemDetails,
        mcq_details: mcqDetails,
        student: {
          name: sub.user_name,
          email: sub.user_email,
          batch: "Public",
        },
      };
    });
  }, [participantSubmissions, selectedChallenge]);

  const leaderboardMeta = useMemo(
    () => ({
      total_participants: transformedLeaderboardData.length,
      challenge_title: selectedChallenge?.title,
      challenge_date: selectedChallenge?.challenge_start_at,
      mcq_count: selectedChallenge?.mcq_questions_count || 0,
      problem_count: selectedChallenge?.problems_count || 0,
    }),
    [transformedLeaderboardData, selectedChallenge]
  );

  const handleViewLeaderboard = (challenge) => {
    setSelectedChallenge(challenge);
    setShowLeaderboardModal(true);
    dispatch(fetchParticipantSubmissions(challenge.id));
  };

  const handleCopyLink = (challenge) => {
    if (challenge?.challenge_type !== SCHOLARSHIP_SHARE_TYPE) {
      showErrorToast(
        "Scholarship share links are only available for college-student tests."
      );
      return;
    }
    setCopyLinkChallenge(challenge);
    setShowCopyLinkModal(true);
  };

  const handleRefreshLeaderboard = () => {
    if (selectedChallenge) {
      dispatch(fetchParticipantSubmissions(selectedChallenge.id));
    }
  };

  const handleDelete = async (challengeId) => {
    if (
      !window.confirm(
        "Delete this scholarship test? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      await dispatch(deletePublicChallenge(challengeId)).unwrap();
      showSuccessToast("Challenge deleted");
    } catch (err) {
      showErrorToast(err?.message || "Could not delete challenge");
    }
  };

  const typeBadge = (type) =>
    type === SCHOLARSHIP_SHARE_TYPE
      ? "border-purple-200 bg-purple-50 text-purple-900"
      : "border-border bg-muted/60 text-foreground";

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card className="overflow-hidden border-0 shadow-md ring-1 ring-black/[0.04]">
        <CardHeader className="space-y-1 border-b border-border/60 bg-gradient-to-r from-card via-card to-primary/[0.04] pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Trophy className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {SCHOLARSHIP_TEST_NAV_LABEL}
                </CardTitle>
                <CardDescription className="mt-1 max-w-xl text-base leading-relaxed">
                  Run scholarship tests: create sessions, share links, and open leaderboards.
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleCreate} size="lg" className="shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              New challenge
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="relative min-w-[200px] flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search title, slug, creator…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
                aria-label="Search challenges"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Created
                </span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[140px]"
                  aria-label="Created from"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[140px]"
                  aria-label="Created to"
                />
              </div>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    setSearchInput("");
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{totalCount}</span>{" "}
            {totalCount === 1 ? "challenge" : "challenges"}
            {totalPages > 1 && (
              <span className="text-muted-foreground">
                {" "}
                · page {challengesListMeta?.page ?? page} of {totalPages}
              </span>
            )}
          </p>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading challenges…</p>
            </div>
          ) : challenges.length === 0 ? (
            <Card className="border-dashed border-border/80 bg-muted/20">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Trophy className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {hasActiveFilters ? "No matching challenges" : "No challenges yet"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasActiveFilters
                      ? "Try different search or date range."
                      : "Create one to get a shareable link and leaderboard."}
                  </p>
                </div>
                {!hasActiveFilters && (
                  <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New challenge
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <ul className="flex flex-col gap-4">
              {challenges.map((challenge) => {
                const isActive =
                  !challenge.challenge_end_at ||
                  new Date(challenge.challenge_end_at) > new Date();
                return (
                  <li key={challenge.id}>
                    <Card className="overflow-hidden transition-shadow hover:shadow-md">
                      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <h3 className="truncate text-lg font-semibold text-foreground">
                            {challenge.title}
                          </h3>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {challenge.slug}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {challenge.created_by_name && (
                              <span>
                                By{" "}
                                <span className="font-medium text-foreground">
                                  {challenge.created_by_name}
                                </span>
                              </span>
                            )}
                            {challenge.challenge_start_at && challenge.challenge_end_at ? (
                              <span>
                                {new Date(challenge.challenge_start_at).toLocaleString("en-IN", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}{" "}
                                →{" "}
                                {new Date(challenge.challenge_end_at).toLocaleString("en-IN", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                            ) : (
                              <span className="italic">Not scheduled</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                typeBadge(challenge.challenge_type || "PUBLIC")
                              )}
                            >
                              {challenge.challenge_type === SCHOLARSHIP_SHARE_TYPE
                                ? "College"
                                : "Public"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {challenge.problem_selection_mode === "AUTO"
                                ? `Auto · ${challenge.auto_problem_count ?? 3} problems / user`
                                : `${challenge.problems_count || 0} problems`}
                              {" · "}
                              {challenge.mcq_questions_count || 0} MCQs
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
                          {isActive &&
                            challenge.challenge_type === SCHOLARSHIP_SHARE_TYPE && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              title="Copy scholarship test link"
                              onClick={() => handleCopyLink(challenge)}
                              className="shrink-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            className="gap-2"
                            onClick={() => handleViewLeaderboard(challenge)}
                          >
                            <BarChart3 className="h-4 w-4" />
                            Leaderboard
                          </Button>
                          {isActive && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={() => handleEdit(challenge)}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                className="gap-2"
                                disabled={deleteLoading}
                                onClick={() => handleDelete(challenge.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && challenges.length > 0 && totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const p = challengesListMeta?.page ?? page;
                  const from = totalCount === 0 ? 0 : (p - 1) * PAGE_SIZE + 1;
                  const to = Math.min(p * PAGE_SIZE, totalCount);
                  return `Showing ${from}–${to} of ${totalCount}`;
                })()}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={(challengesListMeta?.page ?? page) <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={(challengesListMeta?.page ?? page) >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CopyChallengeLinkModal
        open={showCopyLinkModal}
        onClose={() => {
          setShowCopyLinkModal(false);
          setCopyLinkChallenge(null);
        }}
        challenge={copyLinkChallenge}
      />

      <PublicChallengeModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedChallenge(null);
        }}
        challenge={selectedChallenge}
      />

      {selectedChallenge && showLeaderboardModal && (
        <LeaderboardModal
          isOpen={showLeaderboardModal}
          onClose={() => {
            setShowLeaderboardModal(false);
            setSelectedChallenge(null);
          }}
          selectedChallenge={selectedChallenge}
          leaderboardEntries={transformedLeaderboardData}
          leaderboardMeta={leaderboardMeta}
          loading={submissionsLoading}
          onRefresh={handleRefreshLeaderboard}
          expandedEntryId={expandedEntryId}
          onToggleEntry={setExpandedEntryId}
          isPublicChallenge={true}
        />
      )}
    </div>
  );
};

export default PublicChallengeManager;
