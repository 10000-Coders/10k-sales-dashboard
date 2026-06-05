'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { FiX, FiChevronDown, FiCopy, FiCheck, FiFilter, FiSearch, FiUsers, FiFileText, FiTrendingUp, FiChevronUp, FiDownload } from 'react-icons/fi';
import { BsLinkedin } from 'react-icons/bs';
import useToast from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import { exportLeaderboardToExcel, exportPublicChallengeToExcel } from '@/utils/excelExport';

const LeaderboardModal = ({
  isOpen,
  selectedChallenge,
  leaderboardMeta,
  leaderboardEntries: initialEntries,
  expandedEntryId,
  onClose,
  onToggleEntry,
  loading = false,
  batches = [],
  onRefresh,
  onOpenLinkedInPosts,
  isPublicChallenge = false, // New prop to indicate if this is a public challenge
}) => {
  const { showSuccessToast, showErrorToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedBatchStats, setCopiedBatchStats] = useState(false);
  const [filters, setFilters] = useState({
    participantType: 'all', // 'all' or 'success' (success submits = solved at least 1)
    batch: '',
    leaderboardType: 'all', // 'all', 'mcq', 'coding'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 2000);
  const [leaderboardEntries, setLeaderboardEntries] = useState(initialEntries || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false); // Start collapsed by default

  // Update entries when initialEntries change
  useEffect(() => {
    setLeaderboardEntries(initialEntries || []);
  }, [initialEntries]);

  // Fetch data when leaderboard filter changes
  useEffect(() => {
    if (selectedChallenge?.id && onRefresh && filters.leaderboardType) {
      // Trigger parent refresh with new type, OR manual dispatch if parent doesn't handle params
      // Since onRefresh in parent likely just dispatches without params, we might need to modify parent
      // However, checking LeaderboardModal usage, it seems onRefresh is passed.
      // If we want to support filtering, we should probably dispatch locally here using the new Thunk 
      // OR rely on the parent to accept params.

      // Let's assume onRefresh can handle params or we dispatch directly.
      // actually, safely dispatching here is better if we want to support the filter immediately
      // BUT `leaderboardEntries` comes from props `initialEntries`.
      // So we MUST trigger the parent to fetch and pass new props.
      if (onRefresh) {
        onRefresh(filters.leaderboardType);
      }
    }
  }, [filters.leaderboardType, selectedChallenge?.id]);

  // Calculate analytics from full leaderboard data
  const analytics = useMemo(() => {
    if (!leaderboardMeta || !initialEntries || initialEntries.length === 0) {
      return {
        batchWiseStats: {},
        draftsCount: 0,
        totalParticipants: 0,
        successSubmits: 0,
      };
    }

    // Batch-wise statistics (success submits, drafts, submissions)
    const batchWiseStats = {};
    let draftsCount = 0;
    let successSubmits = 0;

    initialEntries.forEach((entry) => {
      const batchName = entry.student_batch_name || entry.student?.batch || entry.student?.batch_name || 'No Batch';
      const solvedCount = entry.problems_solved ?? entry.solved ?? 0;
      const hasDraftsOnly = entry.has_drafts_only || false;
      const hasSubmissions = entry.last_submission_at || entry.last_submission_at !== null;

      // Initialize batch stats if not exists
      if (!batchWiseStats[batchName]) {
        batchWiseStats[batchName] = {
          successSubmits: 0,
          drafts: 0,
          submissions: 0,
          total: 0,
        };
      }

      batchWiseStats[batchName].total++;

      // Count drafts-only participants
      if (hasDraftsOnly) {
        draftsCount++;
        batchWiseStats[batchName].drafts++;
      }

      // Count submissions (any submission, not just successful)
      if (hasSubmissions) {
        batchWiseStats[batchName].submissions++;
      }

      // Count success submits (solved at least 1)
      if (solvedCount >= 1) {
        successSubmits++;
        batchWiseStats[batchName].successSubmits++;
      }
    });

    return {
      batchWiseStats,
      draftsCount,
      totalParticipants: leaderboardMeta.total_participants || initialEntries.length,
      successSubmits,
      participantsWithSubmissions: leaderboardMeta.participants_with_submissions || 0,
      participantsCompleted: leaderboardMeta.participants_completed || 0,
    };
  }, [leaderboardMeta, initialEntries]);

  // Filter and Sort leaderboard entries
  const filteredEntries = useMemo(() => {
    let filtered = [...leaderboardEntries];

    // Filter by participant type
    if (filters.participantType === 'success') {
      filtered = filtered.filter(entry => {
        const solvedCount = entry.problems_solved ?? entry.solved ?? 0;
        return solvedCount >= 1;
      });
    }

    // Filter by batch
    if (filters.batch) {
      filtered = filtered.filter(entry => {
        const batchName = entry.student_batch_name || entry.student?.batch || entry.student?.batch_name || '';
        return batchName === filters.batch;
      });
    }

    // Filter by search (student name)
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.trim().toLowerCase();
      filtered = filtered.filter(entry => {
        const studentName = entry.student_name || entry.student?.name || entry.student?.student_name || '';
        return studentName.toLowerCase().includes(searchLower);
      });
    }

    // Sorting based on leaderboardType
    filtered.sort((a, b) => {
      if (filters.leaderboardType === 'mcq') {
        const pointsA = a.mcq_points ?? 0;
        const pointsB = b.mcq_points ?? 0;
        return pointsB - pointsA;
      } else if (filters.leaderboardType === 'coding') {
        const pointsA = a.coding_points ?? 0;
        const pointsB = b.coding_points ?? 0;
        return pointsB - pointsA;
      } else {
        // Default: Total Points
        const pointsA = a.total_points ?? a.points ?? 0;
        const pointsB = b.total_points ?? b.points ?? 0;
        return pointsB - pointsA;
      }
    });

    return filtered;
  }, [leaderboardEntries, filters, debouncedSearch]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRefresh = async () => {
    if (!selectedChallenge?.id || !onRefresh) return;

    setIsRefreshing(true);
    try {
      // Call parent's refresh handler which will force refresh from API
      await onRefresh(filters.leaderboardType);
    } catch (error) {
      console.error('Failed to refresh leaderboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check if challenge window has ended
  const isChallengeEnded = useMemo(() => {
    if (!selectedChallenge?.window_end_at) return false;
    const now = new Date();
    const windowEndAt = new Date(selectedChallenge.window_end_at);
    return now > windowEndAt;
  }, [selectedChallenge]);

  const formatLeaderboardForWhatsApp = () => {
    const challengeTitle = selectedChallenge?.challenge_title || leaderboardMeta?.challenge_title || 'Challenge';
    const challengeDate = leaderboardMeta?.challenge_date || selectedChallenge?.challenge_date;
    const dateText = challengeDate
      ? new Date(challengeDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      : '';

    const mcqTotal = leaderboardMeta?.mcq_count ?? 0;
    const problemTotal = leaderboardMeta?.problem_count ?? 0;
    const viewType = filters.leaderboardType || 'all'; // 'all' | 'mcq' | 'coding'

    let text = `🏆 *Challenge Leaderboard: ${challengeTitle}*\n`;
    if (dateText) {
      text += `📅 Date: ${dateText}\n`;
    }
    text += `\n`;

    // Header and row format depend on current view: MCQ only, Coding only, or Both
    if (viewType === 'mcq') {
      text += isPublicChallenge
        ? `*Rank | Student Name | Batch | MCQ (correct out of total)*\n`
        : `*Rank | Student Name | Batch | MCQ (pts, correct out of total)*\n`;
      text += `──────────────────────────────────────────────────────────\n`;
    } else if (viewType === 'coding') {
      text += isPublicChallenge
        ? `*Rank | Student Name | Batch | Coding (solved out of total)*\n`
        : `*Rank | Student Name | Batch | Coding (pts, solved out of total)*\n`;
      text += `──────────────────────────────────────────────────────────────\n`;
    } else {
      text += isPublicChallenge
        ? `*Rank | Student Name | Batch | MCQ (correct out of total) | Coding (solved out of total)*\n`
        : `*Rank | Student Name | Batch | MCQ (pts, correct out of total) | Coding (pts, solved out of total) | Total*\n`;
      text += `─────────────────────────────────────────────────────────────────────────────────────────────\n`;
    }

    filteredEntries.forEach((entry, index) => {
      const rank = entry.rank ?? index + 1;
      const studentName = entry.student_name || entry.student?.name || entry.student?.student_name || '—';
      const batchName = entry.student_batch_name || entry.student?.batch || entry.student?.batch_name || '—';
      const mcqCorrect = entry.mcq_solved ?? 0;
      const problemsSolved = entry.problems_solved ?? entry.solved ?? 0;

      const mcqPart = mcqTotal > 0
        ? isPublicChallenge
          ? `${mcqCorrect} correct/${mcqTotal}`
          : `${entry.mcq_points ?? 0}pts, ${mcqCorrect} correct/${mcqTotal}`
        : '—';
      const codingPart = problemTotal > 0
        ? isPublicChallenge
          ? `${problemsSolved} solved/${problemTotal}`
          : `${entry.coding_points ?? 0}pts, ${problemsSolved} solved/${problemTotal}`
        : '—';

      if (viewType === 'mcq') {
        text += `${rank}. ${studentName} | ${batchName} | ${mcqPart}\n`;
      } else if (viewType === 'coding') {
        text += `${rank}. ${studentName} | ${batchName} | ${codingPart}\n`;
      } else {
        text += isPublicChallenge
          ? `${rank}. ${studentName} | ${batchName} | ${mcqPart} | ${codingPart}\n`
          : `${rank}. ${studentName} | ${batchName} | ${mcqPart} | ${codingPart} | ${entry.total_points ?? entry.points ?? 0}pts\n`;
      }
    });

    // Footer stats
    if (leaderboardMeta) {
      text += `\n`;
      text += `📊 *Statistics:*\n`;
      text += `Total Participants: ${analytics.totalParticipants}\n`;
      text += `Success Submits: ${analytics.successSubmits}\n`;
      if (analytics.participantsCompleted) {
        text += `Completed All: ${analytics.participantsCompleted}\n`;
      }
      if (leaderboardMeta.total_possible_points) {
        text += `Total Points: ${leaderboardMeta.total_possible_points}\n`;
      }
    }

    return text;
  };

  const handleCopyLeaderboard = async () => {
    try {
      const formattedText = formatLeaderboardForWhatsApp();
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      showSuccessToast('Leaderboard copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      showSuccessToast('Failed to copy. Please try again.');
    }
  };

  const handleShareToWhatsApp = () => {
    const formattedText = formatLeaderboardForWhatsApp();
    const encodedText = encodeURIComponent(formattedText);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  const formatBatchStatsForWhatsApp = () => {
    if (!analytics.batchWiseStats || Object.keys(analytics.batchWiseStats).length === 0) {
      return '';
    }

    let text = '*Batch-wise Statistics*\n\n';

    const sortedBatches = Object.entries(analytics.batchWiseStats)
      .sort((a, b) => b[1].total - a[1].total);

    sortedBatches.forEach(([batchName, stats]) => {
      text += `*${batchName}*\n`;
      text += `Total: ${stats.total} | Submissions: ${stats.submissions}\n\n`;
    });

    return text;
  };

  const handleCopyBatchStats = async () => {
    try {
      const formattedText = formatBatchStatsForWhatsApp();
      await navigator.clipboard.writeText(formattedText);
      setCopiedBatchStats(true);
      showSuccessToast('Batch statistics copied to clipboard!');
      setTimeout(() => setCopiedBatchStats(false), 3000);
    } catch (error) {
      showSuccessToast('Failed to copy. Please try again.');
    }
  };

  const handleShareBatchStatsToWhatsApp = () => {
    const formattedText = formatBatchStatsForWhatsApp();
    const encodedText = encodeURIComponent(formattedText);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleExportToExcel = () => {
    try {
      if (isPublicChallenge) {
        exportPublicChallengeToExcel(
          filteredEntries,
          leaderboardMeta,
          selectedChallenge,
          filters.leaderboardType
        );
      } else {
        exportLeaderboardToExcel(
          filteredEntries,
          leaderboardMeta,
          selectedChallenge,
          filters.leaderboardType
        );
      }
      showSuccessToast('Excel file downloaded successfully!');
    } catch (error) {
      showErrorToast(error.message || 'Failed to export Excel file');
    }
  };

  // Get unique batch names from leaderboard entries
  const availableBatches = useMemo(() => {
    const batchSet = new Set();
    initialEntries.forEach(entry => {
      const batchName = entry.student_batch_name || entry.student?.batch || entry.student?.batch_name;
      if (batchName) batchSet.add(batchName);
    });
    return Array.from(batchSet).sort();
  }, [initialEntries]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 min-h-screen z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#E84975] to-[#FF8541]">
          <div className="text-white">
            <h3 className="text-lg font-semibold">Leaderboard</h3>
            <p className="text-sm opacity-90">
              {selectedChallenge?.challenge_title || selectedChallenge?.title}
            </p>
            {leaderboardMeta?.challenge_date && (
              <p className="text-xs opacity-75">
                {new Date(leaderboardMeta.challenge_date).toLocaleString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || !onRefresh}
              className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              aria-label="Refresh leaderboard"
              title={isChallengeEnded ? "Refresh from API (challenge ended - using cached data)" : "Refresh leaderboard"}
            >
              <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isChallengeEnded && <span className="text-xs">(Cached)</span>}
            </button>
            {leaderboardEntries.length > 0 && (
              <>
                <button
                  onClick={handleExportToExcel}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
                  aria-label="Export to Excel"
                  title="Download Excel file"
                >
                  <FiDownload className="w-4 h-4" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={handleCopyLeaderboard}
                  className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors flex items-center gap-1.5"
                  aria-label="Copy leaderboard"
                  title="Copy leaderboard to clipboard"
                >
                  {copied ? (
                    <>
                      <FiCheck className="w-4 h-4" />
                      <span className="text-xs font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <FiCopy className="w-4 h-4" />
                      <span className="text-xs font-medium">Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleShareToWhatsApp}
                  className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
                  aria-label="Share to WhatsApp"
                  title="Share leaderboard on WhatsApp"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span>WhatsApp</span>
                </button>
                {onOpenLinkedInPosts && selectedChallenge?.challenge_type !== 'TEST' && (
                  <button
                    onClick={() => onOpenLinkedInPosts(selectedChallenge)}
                    className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors flex items-center gap-1.5"
                    aria-label="View LinkedIn posts"
                    title="View LinkedIn posts for this challenge"
                  >
                    <BsLinkedin className="w-4 h-4" />
                    <span className="text-xs font-medium">LinkedIn Posts</span>
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
              aria-label="Close leaderboard"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Analytics Section */}
        {leaderboardMeta && initialEntries.length > 0 && (
          <div className="bg-gray-50 border-b border-gray-200">
            {/* Toggle Button */}
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FiTrendingUp className="w-4 h-4 text-Vivid_Tangelo" />
                <h4 className="text-sm font-semibold text-gray-700">Analytics</h4>
              </div>
              {showAnalytics ? (
                <FiChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <FiChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {/* Analytics Content */}
            {showAnalytics && (
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <FiUsers className="w-5 h-5 text-blue-600" />
                      <h4 className="text-sm font-semibold text-gray-700">Total Participants</h4>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalParticipants}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <FiTrendingUp className="w-5 h-5 text-green-600" />
                      <h4 className="text-sm font-semibold text-gray-700">Success Submits</h4>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{analytics.successSubmits}</p>
                    <p className="text-xs text-gray-500 mt-1">Solved at least 1 problem</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <FiFileText className="w-5 h-5 text-orange-600" />
                      <h4 className="text-sm font-semibold text-gray-700">Drafts Only</h4>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{analytics.draftsCount}</p>
                    <p className="text-xs text-gray-500 mt-1">No successful submissions</p>
                  </div>
                </div>

                {/* Batch-wise Statistics */}
                {Object.keys(analytics.batchWiseStats).length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FiUsers className="w-4 h-4 text-Vivid_Tangelo" />
                        Batch-wise Statistics
                      </h4>
                      <button
                        type="button"
                        onClick={handleCopyBatchStats}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        aria-label="Copy batch statistics"
                        title="Copy batch statistics to clipboard"
                      >
                        {copiedBatchStats ? (
                          <>
                            <FiCheck className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <FiCopy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-2">
                      {Object.entries(analytics.batchWiseStats)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([batchName, stats]) => (
                          <div
                            key={batchName}
                            className="flex flex-col gap-1.5 px-2.5 py-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm text-gray-900">{batchName}</span>
                              <span className="text-xs font-bold text-gray-900">Total: {stats.total}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span className="text-gray-600">
                                <span className="font-semibold text-green-700">{stats.successSubmits}</span>
                                <span className="ml-1">Success</span>
                              </span>
                              <span className="text-gray-600">
                                <span className="font-semibold text-blue-700">{stats.submissions}</span>
                                <span className="ml-1">Submissions</span>
                              </span>
                              <span className="text-gray-600">
                                <span className="font-semibold text-orange-700">{stats.drafts}</span>
                                <span className="ml-1">Drafts</span>
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filters Section */}
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <FiFilter className="w-4 h-4 text-Vivid_Tangelo" />
              <h4 className="text-sm font-semibold text-gray-700">Filters & Views</h4>
            </div>

            {/* View Type Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-lg self-start">
              {['all', 'mcq', 'coding'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleFilterChange('leaderboardType', type)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${filters.leaderboardType === type
                    ? 'bg-white text-Vivid_Tangelo shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {type === 'all'
                    ? isPublicChallenge ? 'Overall' : 'All Points'
                    : type === 'mcq'
                      ? 'MCQ Only'
                      : 'Coding Only'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Participant Type Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Participant Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFilterChange('participantType', 'all')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filters.participantType === 'all'
                    ? 'bg-gradient-to-r from-[#E84975] to-[#FF8541] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  All Participants
                </button>
                <button
                  onClick={() => handleFilterChange('participantType', 'success')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filters.participantType === 'success'
                    ? 'bg-gradient-to-r from-[#E84975] to-[#FF8541] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Success Submits
                </button>
              </div>
            </div>

            {/* Batch Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Batch</label>
              <select
                value={filters.batch || 'ALL'}
                onChange={(e) => handleFilterChange('batch', e.target.value === 'ALL' ? '' : e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-Vivid_Tangelo focus:border-Vivid_Tangelo text-sm"
              >
                <option value="ALL">All batches</option>
                {availableBatches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <FiSearch className="w-3 h-3" />
                Search Student
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-Vivid_Tangelo focus:border-Vivid_Tangelo text-sm"
              />
            </div>
          </div>
          {(filters.participantType !== 'all' || filters.batch || searchQuery) && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-600">
                Showing {filteredEntries.length} of {leaderboardEntries.length} entries
              </span>
              <button
                onClick={() => {
                  setFilters({ participantType: 'all', batch: '', leaderboardType: filters.leaderboardType });
                  setSearchQuery('');
                }}
                className="text-xs text-Vivid_Tangelo hover:text-[#E84975] font-medium"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Leaderboard List */}
        <div className="flex-1 overflow-y-auto">
          {loading || isRefreshing ? (
            <div className="py-16 text-center text-gray-500 text-sm">
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-Vivid_Tangelo border-t-transparent animate-spin" />
                Loading leaderboard...
              </div>
            </div>
          ) : filteredEntries.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredEntries.map((entry, index) => {
                const rank = entry.rank ?? index + 1;
                const studentName = entry.student_name || entry.student?.name || '—';
                const batchName = entry.student_batch_name || entry.student?.batch || '—';

                const isMcqView = filters.leaderboardType === 'mcq';
                const isCodingView = filters.leaderboardType === 'coding';

                // Totals from meta (backend returns meta.problem_count, meta.mcq_count)
                const mcqTotal = leaderboardMeta?.mcq_count ?? 0;
                const problemTotal = leaderboardMeta?.problem_count ?? entry.total_problems ?? selectedChallenge?.problems_count ?? 0;
                const mcqSolved = entry.mcq_solved ?? 0;
                const problemsSolved = entry.problems_solved ?? entry.solved ?? 0;
                const studentId = entry.student_id || entry.student?.id || index;
                const isExpanded = expandedEntryId === studentId;
                const hasDraftsOnly = entry.has_drafts_only || false;
                const lastSolveLabel = entry.last_solve_at
                  ? new Date(entry.last_solve_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                  : null;

                return (
                  <div key={studentId} className="p-4 hover:bg-gray-50 transition-colors">
                    <button
                      type="button"
                      onClick={() => onToggleEntry(isExpanded ? null : studentId)}
                      className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm bg-gray-100 text-gray-700">
                          {rank}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{studentName}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500">{batchName}</p>
                            {hasDraftsOnly && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-medium">
                                Draft Only
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 font-medium">
                        {isMcqView && (
                          <>
                            <span>MCQs: {mcqSolved}/{mcqTotal}</span>
                            {!isPublicChallenge && <span>Points: {entry.mcq_points ?? 0}</span>}
                          </>
                        )}
                        {isCodingView && (
                          <>
                            <span>Problems: {problemsSolved}/{problemTotal}</span>
                            {!isPublicChallenge && <span>Points: {entry.coding_points ?? 0}</span>}
                          </>
                        )}
                        {!isMcqView && !isCodingView && (
                          <>
                            {mcqTotal > 0 && <span>MCQs: {mcqSolved}/{mcqTotal}</span>}
                            <span>Problems: {problemsSolved}/{problemTotal}</span>
                            {!isPublicChallenge && <span>Points: {entry.total_points ?? entry.points ?? 0}</span>}
                          </>
                        )}
                        {lastSolveLabel && <span>{lastSolveLabel}</span>}
                        <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          <FiChevronDown className="w-4 h-4" />
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-4 border-t border-gray-100 pt-3">
                        {/* Coding Problems Section - Show if NOT MCQ View */}
                        {!isMcqView && Array.isArray(entry.problem_details) && entry.problem_details.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Coding Problems</h4>
                            <div className="space-y-3">
                              {entry.problem_details.map((problemDetail) => (
                                <div key={`${studentId}-prob-${problemDetail.problem_id}`} className="border border-gray-200 rounded-lg overflow-hidden">
                                  <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {problemDetail.problem_title}
                                      </p>
                                      <p className="text-xs text-gray-500 flex items-center gap-2">
                                        <span className="uppercase tracking-wide font-semibold text-purple-600">
                                          {problemDetail.problem_difficulty}
                                        </span>
                                        <span>· {problemDetail.points || 0} pts</span>
                                        <span>
                                          {problemDetail.solved_at
                                            ? new Date(problemDetail.solved_at).toLocaleTimeString('en-IN', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: true,
                                            })
                                            : '—'}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${problemDetail.verdict === 'AC' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                          }`}>
                                          {problemDetail.verdict || 'N/A'}
                                        </span>
                                      </p>
                                    </div>
                                    <div className="text-xs text-gray-500 text-right">
                                      <div>{problemDetail.time_ms != null ? `${problemDetail.time_ms} ms` : '—'}</div>
                                      <div>{problemDetail.memory_kb != null ? `${problemDetail.memory_kb} KB` : '—'}</div>
                                    </div>
                                  </div>
                                  <div className="bg-slate-900 text-slate-100 text-xs p-4 overflow-x-auto">
                                    <pre className="whitespace-pre-wrap font-mono">
                                      {problemDetail.source_code || '// No code captured'}
                                    </pre>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* MCQs Section - Show if NOT Coding View */}
                        {!isCodingView && Array.isArray(entry.mcq_details) && entry.mcq_details.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">MCQ Questions</h4>
                            <div className="space-y-2">
                              {entry.mcq_details.map((mcqDetail) => (
                                <div key={`${studentId}-mcq-${mcqDetail.question_id}`} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-gray-900 mb-1">
                                        <MarkdownRenderer
                                          content={mcqDetail.question_text}
                                          className="prose-sm max-w-none text-gray-900 [&>p]:mb-0 [&>p]:leading-snug"
                                        />
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
                                        <span className="text-gray-500">
                                          Type: <span className="font-medium text-gray-700">{mcqDetail.question_type}</span>
                                        </span>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-gray-500">
                                          Selected: <span className="font-medium text-gray-900">{mcqDetail.selected_option || mcqDetail.text_answer || '—'}</span>
                                        </span>
                                        {/* Optional: Show correct answer if desired/allowed */}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`text-sm font-bold ${mcqDetail.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                                        {mcqDetail.points} pts
                                      </div>
                                      <div className="text-xs text-gray-400 mt-0.5">
                                        {mcqDetail.submitted_at
                                          ? new Date(mcqDetail.submitted_at).toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true,
                                          })
                                          : '—'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-gray-500 text-sm">
              {leaderboardEntries.length === 0
                ? 'No entries yet.'
                : 'No entries match your filters.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardModal;
