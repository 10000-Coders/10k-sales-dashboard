/** Lead status values, filter options, call outcomes, and badge styles. */

export const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
  { value: "callback", label: "Callback" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "call_done", label: "Call Done" },
  { value: "not_answered", label: "Not Answered" },
  { value: "call_busy", label: "Call Busy" },
  { value: "switch_off", label: "Switch Off" },
  { value: "no_incoming", label: "No Incoming" },
  { value: "out_of_service", label: "Out of Service" },
  { value: "other_language", label: "Other Language" },
];

export const LEAD_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  ...LEAD_STATUS_OPTIONS,
  { value: "enrolled", label: "Enrolled" },
];

/** For LeadFormDialog — includes empty placeholder. */
export const LEAD_STATUS_FORM_OPTIONS = [
  { value: "", label: "Select status" },
  ...LEAD_STATUS_OPTIONS,
];

export const LEAD_CALL_OUTCOME_OPTIONS = [
  { value: "not_answered", label: "Not Answered" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
  { value: "callback", label: "Callback" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "enrolled", label: "Enrolled" },
  { value: "call_done", label: "Call Done" },
  { value: "call_busy", label: "Call Busy" },
  { value: "switch_off", label: "Switch Off" },
  { value: "no_incoming", label: "No Incoming" },
  { value: "out_of_service", label: "Out of Service" },
  { value: "other_language", label: "Other Language" },
  { value: "other", label: "Other" },
];

export const LEAD_STATUS_PREFERRED_ORDER = [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "callback",
  "enrolled",
  "wrong_number",
  "call_done",
  "not_answered",
  "call_busy",
  "switch_off",
  "no_incoming",
  "out_of_service",
  "other_language",
];

export const LEAD_STATUS_STYLES = {
  enrolled: "bg-green-100 text-green-800",
  interested: "bg-blue-100 text-blue-800",
  not_interested: "bg-gray-100 text-gray-700",
  wrong_number: "bg-gray-100 text-gray-700",
  new: "bg-amber-100 text-amber-800",
  callback: "bg-purple-100 text-purple-800",
  contacted: "bg-sky-100 text-sky-800",
  call_done: "bg-teal-100 text-teal-800",
  not_answered: "bg-orange-100 text-orange-800",
  call_busy: "bg-orange-100 text-orange-800",
  switch_off: "bg-orange-100 text-orange-800",
  no_incoming: "bg-orange-100 text-orange-800",
  out_of_service: "bg-orange-100 text-orange-800",
  other_language: "bg-violet-100 text-violet-800",
};

const LEAD_STATUS_SELECT_STYLES = {
  interested: "bg-blue-100 text-blue-800 border-blue-200",
  not_interested: "bg-gray-100 text-gray-700 border-gray-200",
  wrong_number: "bg-gray-100 text-gray-700 border-gray-200",
  new: "bg-amber-100 text-amber-800 border-amber-200",
  callback: "bg-purple-100 text-purple-800 border-purple-200",
  contacted: "bg-sky-100 text-sky-800 border-sky-200",
  call_done: "bg-teal-100 text-teal-800 border-teal-200",
  not_answered: "bg-orange-100 text-orange-800 border-orange-200",
  call_busy: "bg-orange-100 text-orange-800 border-orange-200",
  switch_off: "bg-orange-100 text-orange-800 border-orange-200",
  no_incoming: "bg-orange-100 text-orange-800 border-orange-200",
  out_of_service: "bg-orange-100 text-orange-800 border-orange-200",
  other_language: "bg-violet-100 text-violet-800 border-violet-200",
};

export function getLeadStatusSelectClass(status) {
  return LEAD_STATUS_SELECT_STYLES[status] ?? "";
}
