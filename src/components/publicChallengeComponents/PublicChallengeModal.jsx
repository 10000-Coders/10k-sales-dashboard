'use client';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiX, FiCode, FiHelpCircle, FiCheckCircle } from 'react-icons/fi';
import {
  createPublicChallenge,
  updatePublicChallenge,
  fetchPublicChallenges,
  clearErrors
} from '@/redux/features/publicChallenges/publicChallengeSlice';
import useToast from '@/hooks/useToast';
import ProblemSelectionModal from './ProblemSelectionModal';
import MCQSelectionModal from './MCQSelectionModal';

/** URL slug derived from title (no manual slug field in the form). */
function generateSlugFromTitle(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const PublicChallengeModal = ({ isOpen, onClose, challenge = null }) => {
  const dispatch = useDispatch();
  const { showSuccessToast, showErrorToast } = useToast();

  const createLoading = useSelector(state => state.publicChallenges.createLoading || false);
  const updateLoading = useSelector(state => state.publicChallenges.updateLoading || false);
  const error = useSelector(state => state.publicChallenges.error);
  const user = useSelector(state => state.userAuth?.user ?? null);

  const isEdit = !!challenge;

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    instructions: '',
    challenge_type: 'COLLEGE_STUDENTS',
    problem_selection_mode: 'MANUAL',
    auto_problem_count: 3,
    registration_start_at: '',
    registration_end_at: '',
    challenge_start_at: '',
    challenge_end_at: '',
    challenge_duration_minutes: 60,
    expected_problem_count: 0,
    expected_mcq_count: 0,
    status: 'REGISTRATION',
    problem_ids: [],
    mcq_question_ids: []
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [showMCQModal, setShowMCQModal] = useState(false);

  /* Helper to format date for datetime-local input (YYYY-MM-DDThh:mm) in local time */
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (isOpen) {
      dispatch(clearErrors());
      if (challenge) {
        const problemIds = Array.isArray(challenge.problems) ? challenge.problems.map(p => p.id) : (Array.isArray(challenge.problem_ids) ? challenge.problem_ids : []);
        const mcqIds = Array.isArray(challenge.mcq_questions) ? challenge.mcq_questions.map(q => q.id) : (Array.isArray(challenge.mcq_question_ids) ? challenge.mcq_question_ids : []);
        
        setFormData({
          title: challenge.title || '',
          slug: generateSlugFromTitle(challenge.title || '') || challenge.slug || '',
          description: challenge.description || '',
          instructions: challenge.instructions || '',
          challenge_type: challenge.challenge_type || 'COLLEGE_STUDENTS',
          problem_selection_mode: challenge.problem_selection_mode || 'MANUAL',
          auto_problem_count: challenge.auto_problem_count ?? 3,
          registration_start_at: formatDateForInput(challenge.registration_start_at),
          registration_end_at: formatDateForInput(challenge.registration_end_at),
          challenge_start_at: formatDateForInput(challenge.challenge_start_at),
          challenge_end_at: formatDateForInput(challenge.challenge_end_at),
          challenge_duration_minutes: 60,
          expected_problem_count: challenge.expected_problem_count || 0,
          expected_mcq_count: challenge.expected_mcq_count || 0,
          status: challenge.status || 'REGISTRATION',
          problem_ids: problemIds,
          mcq_question_ids: mcqIds
        });
      } else {
        // Reset for new challenge
        setFormData({
          title: '',
          slug: '',
          description: '',
          instructions: '',
          challenge_type: 'COLLEGE_STUDENTS',
          problem_selection_mode: 'MANUAL',
          auto_problem_count: 3,
          registration_start_at: '',
          registration_end_at: '',
          challenge_start_at: '',
          challenge_end_at: '',
          challenge_duration_minutes: 60,
          expected_problem_count: 0,
          expected_mcq_count: 0,
          status: 'REGISTRATION',
          problem_ids: [],
          mcq_question_ids: []
        });
      }
    }
  }, [isOpen, challenge, dispatch]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleTitleChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      title: value,
      slug: generateSlugFromTitle(value),
    }));
    if (validationErrors.title) {
      setValidationErrors((prev) => ({ ...prev, title: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title?.trim()) errors.title = 'Title is required';
    else if (!generateSlugFromTitle(formData.title)) {
      errors.title =
        'Use letters or numbers in the title so a URL slug can be generated';
    }
    if (!formData.challenge_start_at) errors.challenge_start_at = 'Challenge start required';
    if (formData.challenge_start_at && new Date(formData.challenge_start_at) <= new Date()) {
      errors.challenge_start_at = 'Challenge start must be in the future';
    }
    if (!isEdit) {
      const mins = formData.challenge_duration_minutes;
      if (mins == null || mins === '' || Number(mins) < 1) errors.challenge_duration_minutes = 'Duration is required (min 1)';
    } else {
      if (!formData.challenge_end_at) errors.challenge_end_at = 'Challenge end required';
    }

    if (isEdit) {
      if (!formData.registration_start_at) errors.registration_start_at = 'Registration start required';
      if (!formData.registration_end_at) errors.registration_end_at = 'Registration end required';
      if (formData.registration_start_at && formData.registration_end_at) {
        if (new Date(formData.registration_end_at) <= new Date(formData.registration_start_at)) {
          errors.registration_end_at = 'Registration end must be after start';
        }
      }
    }

    if (isEdit && formData.challenge_start_at && formData.challenge_end_at) {
      if (new Date(formData.challenge_end_at) <= new Date(formData.challenge_start_at)) {
        errors.challenge_end_at = 'Challenge end must be after start';
      }
    }

    if (formData.problem_selection_mode === 'AUTO') {
      const count = formData.auto_problem_count ?? 3;
      if (!count || count < 1) {
        errors.auto_problem_count = 'Problems per user must be at least 1 for Auto mode';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const isAuto = formData.problem_selection_mode === 'AUTO';
      const now = new Date();
      const challengeStart = formData.challenge_start_at ? new Date(formData.challenge_start_at) : null;
      let challengeEnd;
      if (isEdit && formData.challenge_end_at) {
        challengeEnd = new Date(formData.challenge_end_at);
      } else if (challengeStart && formData.challenge_duration_minutes != null) {
        const mins = Number(formData.challenge_duration_minutes) || 60;
        challengeEnd = new Date(challengeStart.getTime() + mins * 60 * 1000);
      } else {
        challengeEnd = null;
      }
      const registrationStart = isEdit && formData.registration_start_at
        ? new Date(formData.registration_start_at)
        : now;
      const registrationEnd = isEdit && formData.registration_end_at
        ? new Date(formData.registration_end_at)
        : (challengeStart || now);

      const slug = generateSlugFromTitle(formData.title?.trim() || '');
      const submitData = {
        ...formData,
        slug,
        challenge_type: formData.challenge_type || 'COLLEGE_STUDENTS',
        problem_selection_mode: formData.problem_selection_mode || 'MANUAL',
        auto_problem_count: isAuto ? (formData.auto_problem_count || 3) : 0,
        registration_start_at: registrationStart.toISOString(),
        registration_end_at: registrationEnd.toISOString(),
        challenge_start_at: (challengeStart || now).toISOString(),
        challenge_end_at: (challengeEnd || now).toISOString(),
        problem_ids: isAuto ? [] : (formData.problem_ids || []),
        mcq_question_ids: formData.mcq_question_ids || [],
        expected_problem_count: isAuto ? (formData.auto_problem_count || 3) : (formData.expected_problem_count || formData.problem_ids?.length || 0),
        expected_mcq_count: formData.expected_mcq_count || formData.mcq_question_ids?.length || 0,
      };
      if (!isEdit) {
        const creatorName = (user?.name || user?.email || '').trim();
        if (creatorName) submitData.created_by_name = creatorName;
      }

      if (isEdit) {
        await dispatch(updatePublicChallenge({ challengeId: challenge.id, challengeData: submitData })).unwrap();
        showSuccessToast('Challenge updated successfully');
      } else {
        await dispatch(createPublicChallenge(submitData)).unwrap();
        showSuccessToast('Challenge created successfully');
      }

      onClose();
      dispatch(fetchPublicChallenges());
    } catch (error) {
      showErrorToast(error?.message || error || 'Failed to save challenge');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {isEdit ? 'Edit challenge' : 'Create scholarship test'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage all challenge details, timings, and content in one place.
                  </p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Basic Info */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Basic Information</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md ${validationErrors.title ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="e.g. Weekly Coding Sprint"
                    />
                    {validationErrors.title && <p className="text-xs text-red-500 mt-1">{validationErrors.title}</p>}
                    <p className="text-xs text-gray-500 mt-1.5">
                      URL slug is generated from the title automatically.
                    </p>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {/* 2. Problem selection mode */}
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-800 mb-3 border-b border-amber-200 pb-2">Problem selection</h4>
                  <p className="text-sm text-gray-600 mb-3">Choose how coding problems are assigned to participants.</p>
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="problem_selection_mode"
                        value="MANUAL"
                        checked={formData.problem_selection_mode === 'MANUAL'}
                        onChange={() => handleInputChange('problem_selection_mode', 'MANUAL')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Manual</span>
                        <p className="text-xs text-gray-500">You select which problems appear in this challenge. All participants see the same problems.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="problem_selection_mode"
                        value="AUTO"
                        checked={formData.problem_selection_mode === 'AUTO'}
                        onChange={() => handleInputChange('problem_selection_mode', 'AUTO')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">Auto</span>
                        <p className="text-xs text-gray-500 mb-2">Each participant gets a random set of problems from the live pool. Different users get different problems.</p>
                        {formData.problem_selection_mode === 'AUTO' && (
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Problems per user</label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={formData.auto_problem_count ?? 3}
                              onChange={(e) => handleInputChange('auto_problem_count', Math.max(1, parseInt(e.target.value, 10) || 3))}
                              className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                            <p className="text-xs text-amber-700 mt-1">Default 3 = 1 Easy, 1 Medium, 1 Hard (from LIVE problems).</p>
                            {validationErrors.auto_problem_count && <p className="text-xs text-red-500 mt-1">{validationErrors.auto_problem_count}</p>}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. Timings */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3 border-b border-blue-200 pb-2">Timings & Schedule</h4>
                  {!isEdit ? (
                    <>
                      <p className="text-sm text-gray-600 mb-3">Registration opens <strong>now</strong> and closes when the challenge starts.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-gray-700">Challenge Start Time <span className="text-red-500">*</span></label>
                          <input type="datetime-local" value={formData.challenge_start_at} onChange={(e) => handleInputChange('challenge_start_at', e.target.value)} className={`w-full px-2 py-1.5 border rounded mt-1 ${validationErrors.challenge_start_at ? 'border-red-500' : 'border-gray-300'}`} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">Duration (minutes) <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={formData.challenge_duration_minutes === '' ? '' : formData.challenge_duration_minutes}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const v = raw === '' ? '' : Math.max(1, parseInt(raw, 10) || 1);
                              handleInputChange('challenge_duration_minutes', v);
                            }}
                            placeholder="e.g. 22, 42, 60"
                            className={`w-full px-2 py-1.5 border rounded mt-1 ${validationErrors.challenge_duration_minutes ? 'border-red-500' : 'border-gray-300'}`}
                          />
                          <p className="text-xs text-gray-500 mt-1">Challenge ends automatically after this duration from start.</p>
                          {validationErrors.challenge_duration_minutes && <p className="text-xs text-red-500 mt-1">{validationErrors.challenge_duration_minutes}</p>}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Registration Window</p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Start Time <span className="text-red-500">*</span></label>
                            <input type="datetime-local" value={formData.registration_start_at} onChange={(e) => handleInputChange('registration_start_at', e.target.value)} className={`w-full px-2 py-1.5 border rounded ${validationErrors.registration_start_at ? 'border-red-500' : 'border-gray-300'}`} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">End Time <span className="text-red-500">*</span></label>
                            <input type="datetime-local" value={formData.registration_end_at} onChange={(e) => handleInputChange('registration_end_at', e.target.value)} className={`w-full px-2 py-1.5 border rounded ${validationErrors.registration_end_at ? 'border-red-500' : 'border-gray-300'}`} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Challenge Window (Active)</p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Start Time <span className="text-red-500">*</span></label>
                            <input type="datetime-local" value={formData.challenge_start_at} onChange={(e) => handleInputChange('challenge_start_at', e.target.value)} className={`w-full px-2 py-1.5 border rounded ${validationErrors.challenge_start_at ? 'border-red-500' : 'border-gray-300'}`} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700">End Time <span className="text-red-500">*</span></label>
                            <input type="datetime-local" value={formData.challenge_end_at} onChange={(e) => handleInputChange('challenge_end_at', e.target.value)} className={`w-full px-2 py-1.5 border rounded ${validationErrors.challenge_end_at ? 'border-red-500' : 'border-gray-300'}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Content Selection */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-3 border-b border-purple-200 pb-2">Challenge Content</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Problems */}
                    <div className="bg-white p-4 rounded border border-purple-100 flex flex-col items-center text-center">
                      <FiCode className="w-8 h-8 text-purple-500 mb-2" />
                      <h5 className="font-medium text-gray-900">Coding Problems</h5>
                      {formData.problem_selection_mode === 'AUTO' ? (
                        <>
                          <p className="text-2xl font-bold text-purple-600 my-2">{formData.auto_problem_count ?? 3}</p>
                          <p className="text-xs text-gray-500 mb-3">per user (Auto: 1 Easy, 1 Medium, 1 Hard when 3)</p>
                          <p className="text-xs text-amber-600">Problems are assigned randomly from LIVE pool when user starts.</p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-purple-600 my-2">{formData.problem_ids.length}</p>
                          <p className="text-xs text-gray-500 mb-3">Selected Problems</p>
                          <button
                            type="button"
                            onClick={() => setShowProblemModal(true)}
                            className="text-sm bg-purple-100 text-purple-700 px-4 py-2 rounded hover:bg-purple-200 font-medium w-full"
                          >
                            Select Problems
                          </button>
                        </>
                      )}
                    </div>

                    {/* MCQs */}
                    <div className="bg-white p-4 rounded border border-purple-100 flex flex-col items-center text-center">
                      <FiHelpCircle className="w-8 h-8 text-purple-500 mb-2" />
                      <h5 className="font-medium text-gray-900">MCQ Questions</h5>
                      <p className="text-2xl font-bold text-purple-600 my-2">{formData.mcq_question_ids.length}</p>
                      <p className="text-xs text-gray-500 mb-3">Selected Questions</p>
                      <button
                        type="button"
                        onClick={() => setShowMCQModal(true)}
                        className="text-sm bg-purple-100 text-purple-700 px-4 py-2 rounded hover:bg-purple-200 font-medium w-full"
                      >
                        Select MCQs
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading || updateLoading}
                    className="px-6 py-2 rounded-md shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  >
                    {createLoading || updateLoading ? <span className="animate-spin">⌛</span> : <FiCheckCircle />}
                    {isEdit ? 'Save Changes' : 'Create Challenge'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Modals */}
      <ProblemSelectionModal
        isOpen={showProblemModal}
        onClose={() => setShowProblemModal(false)}
        selectedProblemIds={formData.problem_ids}
        initialSelectedObjects={challenge?.problems || []}
        onSave={(ids) => handleInputChange('problem_ids', ids)}
      />

      <MCQSelectionModal
        isOpen={showMCQModal}
        onClose={() => setShowMCQModal(false)}
        selectedMCQIds={formData.mcq_question_ids}
        initialSelectedObjects={challenge?.mcq_questions || []}
        onSave={(ids) => handleInputChange('mcq_question_ids', ids)}
      />
    </>
  );
};

export default PublicChallengeModal;

