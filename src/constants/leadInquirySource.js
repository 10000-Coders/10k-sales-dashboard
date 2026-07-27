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
  { value: "college_team", label: "College Team" },
  { value: "meta_uday", label: "Meta Uday" },
  { value: "meta_sai_kiran", label: "Meta Sai kiran" },
  { value: "meta_vasanth", label: "Meta Vasanth" },
  { value: "meta_whatsapp_uday", label: "Meta WhatsApp Uday" },
  { value: "meta_whatsapp_sai_kiran", label: "Meta WhatsApp Sai kiran" },
  { value: "meta_whatsapp_vasanth", label: "Meta WhatsApp Vasanth" },
  { value: "incoming_call", label: "Incoming Call" },
  { value: "suresh_referals", label: "SURESH Referals" },
  { value: "crm_referals", label: "CRM Referals" },
  { value: "pm_referals", label: "PM Referals" },
  { value: "triner_referals", label: "TRINER Referals" },
  { value: "ai_calling_agent", label: "AI Calling Agent" },
  { value: "workshop", label: "Workshop" },
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
