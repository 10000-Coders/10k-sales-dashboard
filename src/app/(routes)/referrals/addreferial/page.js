'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import Select from 'react-select';
import { IoIosSearch } from 'react-icons/io';
import { useDispatch, useSelector } from 'react-redux';

import withPrivateAuth from '@/components/withPrivateAuth';
import SpinnerLoader from '@/components/SpinnerLoader';
import { getAllStudentsFromBackend } from '@/redux/features/referralForm/referralFormSlice';
import StudentReferralModal from '@/components/referrals/StudentReferralModal';
import { getAllBatchNames } from '@/utils/referrialApis';
import DecryptedPii from '@/components/DecryptedPii';

const initialFilterState = {
  searchInput: '',
  batches: [],
};

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.35)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#9ca3af',
    },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const AllStudentsPage = () => {
  const dispatch = useDispatch();
  const searchDebounceTimer = useRef(null);

  const { user } = useSelector((state) => state.userAuth);

  const {
  all_students_backend = [],
  all_students_backend_count = 0,
  all_students_backend_total_pages = 1,
  all_students_backend_current_page = 1,
  all_students_backend_page_size = 25,
  all_students_backend_loading = false,
  all_students_backend_error = null,
} = useSelector((state) => state.referralForm || {});

  const [filter, setFilter] = useState(initialFilterState);
  const [allBatchNames, setAllBatchNames] = useState([]);
  const [sortField, setSortField] = useState('student_name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [referralModalStudent, setReferralModalStudent] = useState(null);

  const selectMenuPortalTarget =
    typeof document !== 'undefined' ? document.body : null;

  const { searchInput, batches } = filter;

  const fetchStudentsFromBackend = useCallback(
    (overrideParams = {}) => {
      const mergedFilter = {
        ...filter,
        ...overrideParams,
      };

      const apiParams = {
        search: mergedFilter.searchInput || '',
        mode: 'All',
        branches: [],
        statuses: [],
        pass_years: [],
        batches: mergedFilter.batches || [],
        colleges: [],
        placed: null,
        has_reference: null,
        include_deleted: user?.role === 'super_admin',

        page: overrideParams.page ?? page,
        page_size: overrideParams.pageSize ?? pageSize,
        sort_by: overrideParams.sortField ?? sortField,
        sort_order: overrideParams.sortDirection ?? sortDirection,
      };

      dispatch(getAllStudentsFromBackend(apiParams));
    },
    [dispatch, filter, page, pageSize, sortField, sortDirection, user?.role]
  );

  useEffect(() => {
    fetchStudentsFromBackend({ page: 1 });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const batches = await getAllBatchNames();
        if (!cancelled) setAllBatchNames(batches);
      } catch {
        if (!cancelled) setAllBatchNames([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      all_students_backend_current_page &&
      all_students_backend_current_page !== page
    ) {
      setPage(all_students_backend_current_page);
    }
  }, [all_students_backend_current_page, page]);

  useEffect(() => {
    if (
      all_students_backend_page_size &&
      all_students_backend_page_size !== pageSize
    ) {
      setPageSize(all_students_backend_page_size);
    }
  }, [all_students_backend_page_size, pageSize]);

  useEffect(() => {
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, []);

  const batchOptions = useMemo(() => {
    return allBatchNames.map((batchName) => ({
      label: batchName,
      value: batchName,
    }));
  }, [allBatchNames]);

  const currentPageData = all_students_backend || [];
  const totalPages = all_students_backend_total_pages || 1;
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(
    startIndex + pageSize,
    all_students_backend_count || 0
  );

  const handleInputChange = useCallback(
    (event) => {
      const { name, type, value, checked } = event.target;
      const newValue = type === 'checkbox' ? checked : value;

      setFilter((prev) => ({
        ...prev,
        [name]: newValue,
      }));

      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }

      searchDebounceTimer.current = setTimeout(() => {
        setPage(1);
        fetchStudentsFromBackend({
          [name]: newValue,
          page: 1,
        });
      }, 2000);
    },
    [fetchStudentsFromBackend]
  );

  const handleBatchChange = useCallback(
    (selected) => {
      const values = selected ? selected.map((option) => option.value) : [];

      setFilter((prev) => ({
        ...prev,
        batches: values,
      }));

      setPage(1);
      fetchStudentsFromBackend({
        batches: values,
        page: 1,
      });
    },
    [fetchStudentsFromBackend]
  );

  const handleSort = useCallback(
    (field) => {
      const nextDirection =
        sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';

      setSortField(field);
      setSortDirection(nextDirection);
      setPage(1);

      fetchStudentsFromBackend({
        sortField: field,
        sortDirection: nextDirection,
        page: 1,
      });
    },
    [sortField, sortDirection, fetchStudentsFromBackend]
  );

  const resetFilters = useCallback(() => {
    setFilter(initialFilterState);
    setSortField('student_name');
    setSortDirection('asc');
    setPage(1);

    fetchStudentsFromBackend({
      ...initialFilterState,
      sortField: 'student_name',
      sortDirection: 'asc',
      page: 1,
    });
  }, [fetchStudentsFromBackend]);

  const handleItemsPerPageChange = useCallback(
    (value) => {
      setPageSize(value);
      setPage(1);

      fetchStudentsFromBackend({
        pageSize: value,
        page: 1,
      });
    },
    [fetchStudentsFromBackend]
  );

  const goToPage = useCallback(
    (newPage) => {
      setPage(newPage);
      fetchStudentsFromBackend({
        page: newPage,
      });
    },
    [fetchStudentsFromBackend]
  );

  const goToNextPage = () => {
    if (page < totalPages) {
      goToPage(page + 1);
    }
  };

  const goToPrevPage = () => {
    if (page > 1) {
      goToPage(page - 1);
    }
  };

  const getPageNumbers = useCallback(() => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i += 1) {
        pages.push(i);
      }

      return pages;
    }

    if (page <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (page >= totalPages - 2) {
      pages.push(
        1,
        '...',
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
    }

    return pages;
  }, [page, totalPages]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="mx-auto max-w-full space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-3xl font-bold text-transparent">
              All Students
            </h1>
            <p className="mt-1 text-gray-600">
              Explore every student across all batches
            </p>
          </div>

          <Link
            href="/referrals"
            className="rounded-lg border border-blue-500 bg-white px-4 py-2 font-medium text-blue-500"
          >
            Back to Referrals
          </Link>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-start gap-2">
              <IoIosSearch size={20} className="mt-1 text-gray-600" />
              <div>
                <p className="text-lg font-semibold text-gray-700">
                  Search Student
                </p>
                <p className="text-xs text-gray-500">
                  Search by name, email, mobile, or batch name
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-sm text-gray-500 hover:text-blue-500"
            >
              Clear filters
            </button>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <input
              type="text"
              name="searchInput"
              value={searchInput}
              onChange={handleInputChange}
              placeholder="Enter student name, email or mobile"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <Select
              options={batchOptions}
              value={batchOptions.filter((option) =>
                batches.includes(option.value)
              )}
              onChange={handleBatchChange}
              styles={selectStyles}
              isMulti
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              isSearchable
              placeholder="Batch Name"
              menuPortalTarget={selectMenuPortalTarget}
              menuPosition="fixed"
            />
          </div>

          <div className="mb-4 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Show</label>

            <select
              value={pageSize}
              onChange={(event) =>
                handleItemsPerPageChange(Number(event.target.value))
              }
              className="rounded-md border border-gray-300 px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span className="text-sm text-gray-600">entries per page</span>
          </div>

          <div className="overflow-hidden rounded-lg border bg-white shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      SI No
                    </th>

                    <th
                      className="cursor-pointer px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      onClick={() => handleSort('student_name')}
                    >
                      Student{' '}
                      {sortField === 'student_name' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>

                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Email
                    </th>

                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Degree
                    </th>

                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Batch
                    </th>

                    <th
                      className="cursor-pointer px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      onClick={() => handleSort('mode_of_classes')}
                    >
                      Mode{' '}
                      {sortField === 'mode_of_classes' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>

                    <th
                      className="cursor-pointer px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      onClick={() => handleSort('status')}
                    >
                      Status{' '}
                      {sortField === 'status' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>

                    <th
                      className="cursor-pointer px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      onClick={() => handleSort('attendance')}
                    >
                      Attendance{' '}
                      {sortField === 'attendance' &&
                        (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>

                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Student Referral
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {all_students_backend_loading ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <SpinnerLoader className="h-6 w-6 border-b-2 border-blue-500" />
                          <span className="text-gray-600">
                            Loading students...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : all_students_backend_error ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-4 py-6 text-center text-red-500"
                      >
                        Error: {all_students_backend_error}
                      </td>
                    </tr>
                  ) : currentPageData.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-4 py-6 text-center text-gray-500"
                      >
                        No students found matching the filters
                      </td>
                    </tr>
                  ) : (
                    currentPageData.map((student, index) => {
                      const serialNumber = startIndex + index + 1;

                      const attendanceValue =
                        Number(
                          String(student.attendance || '')
                            .replace('%', '')
                            .trim()
                        ) || 0;

                      const attendanceBar = {
                        background:
                          attendanceValue > 50 || attendanceValue === 0
                            ? `radial-gradient(closest-side, #F2F2F2 79%, transparent 80% 100%), conic-gradient(#332C60, #8A79F8 ${attendanceValue}%, #D9D9D9 0)`
                            : `radial-gradient(closest-side, #F2F2F2 79%, transparent 80% 100%), conic-gradient(#FC9595 ${attendanceValue}%, #D9D9D9 0)`,
                      };

                      return (
                        <tr
                          key={student.id || student.student_email || serialNumber}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-3 py-3 text-sm text-gray-700">
                            {serialNumber}
                          </td>

                          <td className="px-3 py-3 text-sm font-semibold text-gray-800">
                            {student.student_name || '-'}
                          </td>

                          <td className="px-3 py-3 text-sm text-gray-600">
                            <DecryptedPii value={student.student_email} fallback="-" />
                          </td>

                          <td className="px-3 py-3 text-sm text-gray-600">
                            {student.student_degree || '-'}
                          </td>

                          <td className="px-3 py-3 text-sm text-gray-600">
                            {student.student_batch || student.batch || '-'}
                          </td>

                          <td className="px-3 py-3 text-sm text-gray-600">
                            {student.mode_of_classes || 'Offline'}
                          </td>

                          <td className="px-3 py-3 text-sm text-gray-600">
                            {student.status || '-'}
                          </td>

                          <td className="px-3 py-3 text-sm text-gray-600">
                            <div
                              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold"
                              style={attendanceBar}
                            >
                              {student.attendance || '-'}
                            </div>
                          </td>

                          <td className="px-3 py-3 text-sm">
                            {student.id ? (
                              <button
                                type="button"
                                onClick={() => setReferralModalStudent(student)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-500 hover:bg-blue-50"
                                title="Add referral for this student"
                              >
                                Student Referral
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="text-sm text-gray-600">
              Showing {all_students_backend_count ? startIndex + 1 : 0} to{' '}
              {endIndex} of {all_students_backend_count} entries
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPrevPage}
                  disabled={page === 1 || all_students_backend_loading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((pageNum, index) => (
                    <button
                      type="button"
                      key={`${pageNum}-${index}`}
                      onClick={() =>
                        typeof pageNum === 'number' && goToPage(pageNum)
                      }
                      disabled={pageNum === '...'}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${
                        pageNum === page
                          ? 'bg-blue-500 text-white'
                          : pageNum === '...'
                            ? 'cursor-default text-gray-400'
                            : 'border border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={page === totalPages || all_students_backend_loading}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}

            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>
          </div>
        </div>
      </div>

      <StudentReferralModal
        open={Boolean(referralModalStudent)}
        referrer={referralModalStudent}
        onClose={() => setReferralModalStudent(null)}
      />
    </main>
  );
};

export default withPrivateAuth(AllStudentsPage);