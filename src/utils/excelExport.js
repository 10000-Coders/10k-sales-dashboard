import * as XLSX from 'xlsx';

/**
 * Export Test Centre/Challenge leaderboard to Excel (Simplified format)
 * @param {Array} entries - Leaderboard entries
 * @param {Object} meta - Leaderboard metadata
 * @param {Object} challenge - Challenge object
 * @param {string} viewType - 'all', 'mcq', or 'coding'
 */
export const exportLeaderboardToExcel = (entries, meta, challenge, viewType = 'all') => {
  if (!entries || entries.length === 0) {
    throw new Error('No data to export');
  }

  const challengeTitle = challenge?.challenge_title || meta?.challenge_title || 'Challenge';
  const challengeType = challenge?.challenge_type || 'CHALLENGE';
  const challengeDate = meta?.challenge_date || challenge?.challenge_date;
  
  const mcqTotal = meta?.mcq_count ?? 0;
  const problemTotal = meta?.problem_count ?? 0;
  const totalProblemPoints = problemTotal * 100;

  const worksheetData = [];
  
  // Title rows
  worksheetData.push([`Leaderboard - ${challengeTitle}`]);
  if (challengeDate) {
    const dateStr = new Date(challengeDate).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    worksheetData.push([`Date: ${dateStr}`]);
  }
  worksheetData.push([`Type: ${challengeType}`]);
  worksheetData.push([]);

  // Column headers
  const headers = ['Rank', 'Student Name', 'Batch'];
  
  if (viewType === 'all' || viewType === 'mcq') {
    if (mcqTotal > 0) {
      headers.push('MCQ');
    }
  }
  
  if (viewType === 'all' || viewType === 'coding') {
    headers.push('Problems', 'Problem Points');
  }
  
  worksheetData.push(headers);

  // Data rows
  entries.forEach((entry, index) => {
    const rank = entry.rank ?? index + 1;
    const studentName = entry.student_name || entry.student?.name || entry.student?.student_name || '-';
    const batchName = entry.student_batch_name || entry.student?.batch || entry.student?.batch_name || '-';
    
    const mcqPoints = entry.mcq_points ?? 0;
    const mcqSolved = entry.mcq_solved ?? 0;
    const mcqDisplay = mcqTotal > 0 ? `${mcqPoints}/${mcqTotal * 1}` : '-';
    
    const codingPoints = entry.coding_points ?? 0;
    const problemsSolved = entry.problems_solved ?? entry.solved ?? 0;
    const problemsDisplay = `${problemsSolved}/${problemTotal}`;
    const problemPointsDisplay = `${codingPoints}/${totalProblemPoints}`;

    const row = [rank, studentName, batchName];
    
    if (viewType === 'all' || viewType === 'mcq') {
      if (mcqTotal > 0) {
        row.push(mcqDisplay);
      }
    }
    
    if (viewType === 'all' || viewType === 'coding') {
      row.push(problemsDisplay, problemPointsDisplay);
    }
    
    worksheetData.push(row);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  const colWidths = [
    { wch: 6 },  // Rank
    { wch: 25 }, // Student Name
    { wch: 20 }, // Batch
  ];
  
  if (viewType === 'all' || viewType === 'mcq') {
    if (mcqTotal > 0) {
      colWidths.push({ wch: 12 }); // MCQ
    }
  }
  
  if (viewType === 'all' || viewType === 'coding') {
    colWidths.push({ wch: 12 }, { wch: 15 }); // Problems, Problem Points
  }
  
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leaderboard');

  const filename = `${challengeTitle.replace(/[^a-z0-9]/gi, '_')}_${viewType}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

/**
 * Export Public Challenge leaderboard to Excel (Simplified format)
 * @param {Array} entries - Leaderboard entries (participants)
 * @param {Object} meta - Leaderboard metadata
 * @param {Object} challenge - Challenge object
 * @param {string} viewType - 'all', 'mcq', or 'coding'
 */
export const exportPublicChallengeToExcel = (entries, meta, challenge, viewType = 'all') => {
  if (!entries || entries.length === 0) {
    throw new Error('No data to export');
  }

  const challengeTitle = challenge?.title || challenge?.challenge_title || meta?.challenge_title || 'Scholarship test';
  const mcqTotal = (challenge?.mcq_questions_count || meta?.mcq_count) ?? 0;
  const problemTotal = (challenge?.problems_count || meta?.problem_count) ?? 0;

  const worksheetData = [];
  
  // Title rows
  worksheetData.push([`Scholarship test leaderboard — ${challengeTitle}`]);
  worksheetData.push([]);

  // Column headers
  const headers = ['Rank', 'Participant Name', 'Email', 'Phone'];
  
  if (viewType === 'all' || viewType === 'mcq') {
    if (mcqTotal > 0) {
      headers.push('MCQ Correct');
    }
  }
  
  if (viewType === 'all' || viewType === 'coding') {
    headers.push('Problems Solved');
  }
  
  worksheetData.push(headers);

  // Data rows
  entries.forEach((entry, index) => {
    const rank = entry.rank ?? index + 1;
    const participantName = entry.user_name || entry.student_name || entry.participant_name || entry.student?.name || '-';
    const email = entry.user_email || entry.student_email || entry.participant_email || entry.email || '-';
    const phone = entry.user_phone || entry.student_phone || entry.participant_phone || entry.phone || entry.mobile || '-';
    
    const mcqSolved = entry.mcq_solved ?? 0;
    const mcqDisplay = mcqTotal > 0 ? `${mcqSolved}/${mcqTotal}` : '-';
    
    const problemsSolved = entry.problems_solved ?? entry.solved ?? 0;
    const problemsDisplay = `${problemsSolved}/${problemTotal}`;

    const row = [rank, participantName, email, phone];
    
    if (viewType === 'all' || viewType === 'mcq') {
      if (mcqTotal > 0) {
        row.push(mcqDisplay);
      }
    }
    
    if (viewType === 'all' || viewType === 'coding') {
      row.push(problemsDisplay);
    }
    
    worksheetData.push(row);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  const colWidths = [
    { wch: 6 },  // Rank
    { wch: 25 }, // Participant Name
    { wch: 30 }, // Email
    { wch: 15 }, // Phone
  ];
  
  if (viewType === 'all' || viewType === 'mcq') {
    if (mcqTotal > 0) {
      colWidths.push({ wch: 14 }); // MCQ Correct
    }
  }
  
  if (viewType === 'all' || viewType === 'coding') {
    colWidths.push({ wch: 16 }); // Problems Solved
  }
  
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leaderboard');

  const filename = `PublicChallenge_${challengeTitle.replace(/[^a-z0-9]/gi, '_')}_${viewType}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
};
