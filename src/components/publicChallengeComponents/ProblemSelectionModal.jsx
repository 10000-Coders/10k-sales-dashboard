'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import axios from '@/lib/coreApi';
import { useDebounce } from '@/hooks/useDebounce';

const PAGE_SIZE = 20;

const ProblemSelectionModal = ({ isOpen, onClose, selectedProblemIds, initialSelectedObjects, onSave }) => {
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedObjects, setSelectedObjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [difficulty, setDifficulty] = useState('ALL');

    const [pageProblems, setPageProblems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [listLoading, setListLoading] = useState(false);

    const debouncedSearch = useDebounce(searchTerm, 500);

    // Initialize selected IDs and Objects when modal opens
    useEffect(() => {
        if (isOpen) {
            const initialIds = selectedProblemIds || [];
            setSelectedIds(initialIds);
            if (initialSelectedObjects && initialSelectedObjects.length > 0) {
                setSelectedObjects(initialSelectedObjects.filter(p => initialIds.includes(p.id)));
            } else {
                setSelectedObjects([]);
            }
        }
    }, [isOpen, selectedProblemIds, initialSelectedObjects]);

    const fetchPage = useCallback(async (page) => {
        setListLoading(true);
        try {
            const queryObj = {
                page,
                page_size: PAGE_SIZE,
                status: 'LIVE',
                listed_in_catalog: 'true',
            };
            if (debouncedSearch) queryObj.search = debouncedSearch;
            if (difficulty !== 'ALL') queryObj.difficulty = difficulty;
            const query = new URLSearchParams(queryObj).toString();
            const response = await axios.get(`mentor/problems/?${query}`);
            const data = response.data?.data || [];
            const meta = response.data?.metadata || {};
            setPageProblems(data);
            setCurrentPage(meta.page ?? page);
            setTotalPages(meta.total_pages ?? 0);
            setTotalCount(meta.total_count ?? 0);
        } catch {
            setPageProblems([]);
            setTotalPages(0);
            setTotalCount(0);
        } finally {
            setListLoading(false);
        }
    }, [debouncedSearch, difficulty]);

    // Fetch page when modal opens or filters change (reset to page 1)
    useEffect(() => {
        if (isOpen) {
            setCurrentPage(1);
            fetchPage(1);
        }
    }, [isOpen, debouncedSearch, difficulty, fetchPage]);

    // Fetch a specific page when user clicks prev/next
    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
        fetchPage(page);
    };

    const handleToggle = (problem) => {
        const id = problem.id;
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(pId => pId !== id));
            setSelectedObjects(prev => prev.filter(p => p.id !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
            setSelectedObjects(prev => {
                // Check if already in list to avoid duplicates (though IDs check should prevent this)
                if (prev.find(p => p.id === id)) return prev;
                return [...prev, problem];
            });
        }
    };

    const handleRemoveSelected = (id) => {
        setSelectedIds(prev => prev.filter(pId => pId !== id));
        setSelectedObjects(prev => prev.filter(p => p.id !== id));
    };

    const handleSave = () => {
        onSave(selectedIds);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                Select Problems
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Selected Items Section */}
                        {selectedObjects.length > 0 && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <h4 className="text-sm font-semibold text-blue-800 mb-2">Selected Problems ({selectedObjects.length})</h4>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {selectedObjects.map(problem => (
                                        <div key={problem.id} className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded text-xs shadow-sm">
                                            <span className="truncate max-w-[150px]">{problem.title}</span>
                                            <button
                                                onClick={() => handleRemoveSelected(problem.id)}
                                                className="text-blue-400 hover:text-red-500 focus:outline-none"
                                            >
                                                <FiX size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search problems..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                            </div>

                            {/* Difficulty Filter */}
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">All Difficulties</option>
                                <option value="EASY">Easy</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HARD">Hard</option>
                            </select>
                        </div>

                        {/* List */}
                        <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-md">
                            {listLoading ? (
                                <div className="p-6 text-center text-gray-500">
                                    <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2" />
                                    <p>Loading problems...</p>
                                </div>
                            ) : pageProblems.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                    No LIVE + catalog problems found matching your criteria
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {pageProblems.map(problem => (
                                        <label key={problem.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(problem.id)}
                                                onChange={() => handleToggle(problem)}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-900">{problem.title}</div>
                                                <div className="text-xs text-gray-500 flex gap-2">
                                                    <span className={`px-2 py-0.5 rounded-full bg-gray-100 ${problem.difficulty === 'EASY' ? 'text-green-700' :
                                                        problem.difficulty === 'MEDIUM' ? 'text-yellow-700' : 'text-red-700'
                                                        }`}>
                                                        {problem.difficulty}
                                                    </span>
                                                    <span>Points: {problem.points}</span>
                                                </div>
                                            </div>
                                            {selectedIds.includes(problem.id) && (
                                                <div className="text-blue-600">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && !listLoading && (
                            <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
                                <button
                                    type="button"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    <FiChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                    {totalCount > 0 && (
                                        <span className="text-gray-500 ml-1">({totalCount} total)</span>
                                    )}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    Next
                                    <FiChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="mt-2 text-sm text-gray-500 text-right">
                            Total Selected: {selectedIds.length}
                        </div>

                        {/* Actions */}
                        <div className="mt-5 sm:mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Save Selection
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProblemSelectionModal;
