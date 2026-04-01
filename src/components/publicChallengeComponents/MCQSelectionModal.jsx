'use client';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiX, FiSearch } from 'react-icons/fi';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import { fetchMCQQuestions, fetchMCQCategories } from '@/redux/features/mcqQuestions/mcqQuestionSlice';
import { useDebounce } from '@/hooks/useDebounce';

const MCQSelectionModal = ({ isOpen, onClose, selectedMCQIds, initialSelectedObjects, onSave }) => {
    const dispatch = useDispatch();
    const allMCQQuestions = useSelector(state => state.mcqQuestions.allQuestions || []);
    const categories = useSelector(state => state.mcqQuestions.categories || []);

    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedObjects, setSelectedObjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [difficulty, setDifficulty] = useState('ALL');
    const [categoryId, setCategoryId] = useState('ALL');

    const debouncedSearch = useDebounce(searchTerm, 500);

    // Normalize initialSelectedObjects (can be array or { ids, objects })
    const initialObjectsArray = Array.isArray(initialSelectedObjects)
        ? initialSelectedObjects
        : (initialSelectedObjects?.objects || []);

    // Initialize selected IDs and objects only when modal opens or initial props change.
    // Do NOT depend on allMCQQuestions so that changing search/filters does not re-sync and clear selection.
    useEffect(() => {
        if (isOpen) {
            const initialIds = selectedMCQIds || [];
            setSelectedIds(initialIds);

            if (initialObjectsArray.length > 0) {
                setSelectedObjects(initialObjectsArray);
            } else if (allMCQQuestions.length > 0) {
                const foundObjects = allMCQQuestions.filter(q => initialIds.includes(q.id));
                setSelectedObjects(foundObjects);
            } else {
                setSelectedObjects([]);
            }

            if (categories.length === 0) {
                dispatch(fetchMCQCategories());
            }
        }
    }, [isOpen, selectedMCQIds, initialObjectsArray, dispatch, categories.length]);

    // Fill in missing selected objects from current catalog when they appear (e.g. after filter change).
    // Only adds; never clears or overwrites existing selection.
    useEffect(() => {
        if (!isOpen || selectedIds.length === 0 || allMCQQuestions.length === 0) return;
        setSelectedObjects(prev => {
            const haveIds = new Set(prev.map(q => q.id));
            const missingIds = selectedIds.filter(id => !haveIds.has(id));
            if (missingIds.length === 0) return prev;
            const fromList = allMCQQuestions.filter(q => missingIds.includes(q.id));
            if (fromList.length === 0) return prev;
            return [...prev, ...fromList];
        });
    }, [isOpen, selectedIds, allMCQQuestions]);

    // Fetch questions when filters change
    useEffect(() => {
        if (isOpen) {
            dispatch(fetchMCQQuestions({
                search: debouncedSearch,
                difficulty: difficulty === 'ALL' ? '' : difficulty,
                category: categoryId === 'ALL' ? '' : categoryId
            }));
        }
    }, [isOpen, debouncedSearch, difficulty, categoryId, dispatch]);

    const handleToggle = (question) => {
        const id = question.id;
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(qId => qId !== id));
            setSelectedObjects(prev => prev.filter(q => q.id !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
            setSelectedObjects(prev => {
                if (prev.find(q => q.id === id)) return prev;
                return [...prev, question];
            });
        }
    };

    const handleRemoveSelected = (id) => {
        setSelectedIds(prev => prev.filter(qId => qId !== id));
        setSelectedObjects(prev => prev.filter(q => q.id !== id));
    };

    const handleSave = () => {
        onSave(selectedIds, selectedObjects);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                Select MCQ Questions
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Selected Items Section */}
                        {selectedObjects.length > 0 && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <h4 className="text-sm font-semibold text-blue-800 mb-2">Selected Questions ({selectedObjects.length})</h4>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {selectedObjects.map(question => (
                                        <div key={question.id} className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded text-xs shadow-sm">
                                            <span className="truncate max-w-[200px]">{question.question_text?.replace(/[#*]/g, '')}</span>
                                            <button
                                                onClick={() => handleRemoveSelected(question.id)}
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search questions..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                            </div>

                            {/* Category Filter */}
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>

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
                            {allMCQQuestions.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                    No questions found matching your criteria
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {allMCQQuestions.map(question => (
                                        <label key={question.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(question.id)}
                                                onChange={() => handleToggle(question)}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-1 self-start"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900">
                                                    <MarkdownRenderer
                                                        content={question.question_text}
                                                        className="prose-sm max-w-none text-gray-900 [&>p]:mb-0 [&>p]:leading-snug [&>p]:text-sm"
                                                    />
                                                </div>
                                                <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-2">
                                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 uppercase">
                                                        {question.question_type?.replace('_', ' ')}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full bg-gray-100 ${question.difficulty === 'EASY' ? 'text-green-700' :
                                                        question.difficulty === 'MEDIUM' ? 'text-yellow-700' : 'text-red-700'
                                                        }`}>
                                                        {question.difficulty}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                                        {question.category_name || 'Uncategorized'}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-gray-100">Points: {question.points}</span>
                                                </div>
                                            </div>
                                            {selectedIds.includes(question.id) && (
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

export default MCQSelectionModal;
