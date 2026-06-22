/** Inquiry source values stored on Lead.source (API / DB). */
export const LEAD_SOURCE_VALUES = [
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "call", label: "Call" },
  { value: "direct_walk_in", label: "Direct Walk-in" },
  { value: "friend", label: "Friend" },
  { value: "outsource", label: "Outsource" },
  { value: "social_media", label: "Social Media" },
  { value: "family_member", label: "Family Member" },
];

/** Leads list filter — includes all sources + unknown (empty source). */
export const LEAD_SOURCE_FILTER_OPTIONS = [
  { value: "", label: "All sources" },
  ...LEAD_SOURCE_VALUES,
  { value: "unknown", label: "Unknown / not set" },
];

export const INQUIRY_SOURCE_OPTIONS = [
  { value: "", label: "Select inquiry source" },
  ...LEAD_SOURCE_VALUES,
];

const LABEL_BY_VALUE = Object.fromEntries(
  INQUIRY_SOURCE_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])
);

export function getInquirySourceLabel(value) {
  if (!value) return "";
  return LABEL_BY_VALUE[value] ?? value;
}

export function inquirySourceOptionsForValue(currentValue) {
  if (!currentValue || LABEL_BY_VALUE[currentValue]) {
    return INQUIRY_SOURCE_OPTIONS;
  }
  return [...INQUIRY_SOURCE_OPTIONS, { value: currentValue, label: currentValue }];
}
