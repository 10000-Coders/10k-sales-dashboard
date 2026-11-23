/** Persist last students-list filter query so nav links can restore it. */

export const STUDENTS_FILTERS_STORAGE_KEY = "studentsListFilters";

export function saveStudentsFiltersQuery(qs) {
  try {
    sessionStorage.setItem(STUDENTS_FILTERS_STORAGE_KEY, qs || "");
  } catch {
    /* ignore private-mode / quota errors */
  }
}

/** Href for the students list, including the last saved filter query if any. */
export function getStudentsListHref() {
  try {
    const qs = sessionStorage.getItem(STUDENTS_FILTERS_STORAGE_KEY);
    return qs ? `/students?${qs}` : "/students";
  } catch {
    return "/students";
  }
}
