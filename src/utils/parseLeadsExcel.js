import * as XLSX from "xlsx";

/** Trim Excel cells: NBSP → space, collapse repeated spaces, strip ends. */
export function trimCellValue(value, { collapseInner = true } = {}) {
  let s = String(value ?? "")
    .replace(/\u00a0/g, " ")
    .trim();
  if (collapseInner) s = s.replace(/\s+/g, " ");
  return s;
}

/** Lowercase + strip spaces/underscores for header matching (Name, NAME, name → name). */
function normalizeHeaderKey(label) {
  return String(label ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "");
}

/**
 * Map any Name/Phone-like header to canonical keys used downstream.
 * Accepts: Name, NAME, name, Phone, PHONE, phone, Mobile, etc.
 */
function canonicalizeHeader(label) {
  const norm = normalizeHeaderKey(label);
  if (!norm) return "";
  if (norm === "name") return "Name";
  if (
    norm === "phone" ||
    norm === "phonenumber" ||
    norm === "phoneno" ||
    norm === "mobile" ||
    norm === "mobilenumber" ||
    norm === "mobileno" ||
    norm === "contact" ||
    norm === "contactnumber"
  ) {
    return "Phone";
  }
  if (norm === "email" || norm === "emailid" || norm === "mail") return "Email";
  if (norm === "addedtime" || norm === "addedat") return "Added Time";
  if (norm === "referredby") return "Referred By";
  if (norm === "referredbybatch") return "Referred By Batch";
  return String(label ?? "").trim();
}

function isNameHeader(label) {
  return canonicalizeHeader(label) === "Name";
}

function isPhoneHeader(label) {
  return canonicalizeHeader(label) === "Phone";
}

/** Read a field from a parsed row by canonical or original key (any casing). */
function getRowValue(row, canonicalKey) {
  if (!row || typeof row !== "object") return "";
  if (row[canonicalKey] != null && String(row[canonicalKey]).trim() !== "") {
    return row[canonicalKey];
  }
  const target = normalizeHeaderKey(canonicalKey);
  for (const [key, value] of Object.entries(row)) {
    if (canonicalizeHeader(key) === canonicalKey || normalizeHeaderKey(key) === target) {
      return value;
    }
  }
  return "";
}

/** Row labels like "May 1st", "May 2nd-3rd", "January 2026" — not lead data */
function isMonthSectionLabel(text) {
  const t = String(text ?? "").trim();
  if (!t || t.includes("@")) return false;
  const monthPattern =
    /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;
  if (!monthPattern.test(t)) return false;
  return /\d/.test(t) || /(st|nd|rd|th)\b/i.test(t);
}

function isLeadDataRow(row) {
  const name = String(getRowValue(row, "Name") ?? "").trim();
  const phone = String(getRowValue(row, "Phone") ?? "").trim();

  if (!name && !phone) return false;
  if (normalizeHeaderKey(name) === "name") return false;
  if (isPhoneHeader(name) && !phone) return false;
  if (isMonthSectionLabel(name) && !phone) return false;
  return true;
}

/**
 * Find the header row: any cell that looks like Name or Phone (any casing, any column).
 */
function findHeaderRowIndex(raw) {
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] ?? [];
    const hasName = row.some((cell) => isNameHeader(cell));
    const hasPhone = row.some((cell) => isPhoneHeader(cell));
    if (hasName || hasPhone) return i;
  }
  return -1;
}

/**
 * Parse a leads worksheet: skip month/section rows, one object per data row.
 * Finds Name/Phone headers in any row/column, any casing (Name, NAME, phone, PHONE, …).
 */
export function parseLeadsWorksheet(worksheet) {
  const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (!raw.length) return [];

  let headerRowIndex = findHeaderRowIndex(raw);
  if (headerRowIndex === -1) headerRowIndex = Math.min(1, raw.length - 1);

  const headerRow = raw[headerRowIndex] ?? [];
  const colCount = Math.max(
    headerRow.length,
    ...raw.slice(headerRowIndex + 1).map((r) => (r ?? []).length),
    0
  );

  // Prefer first occurrence of Name / Phone; keep other columns under trimmed label
  const usedCanonical = new Set();
  const headers = Array.from({ length: colCount }, (_, j) => {
    const rawLabel = String(headerRow[j] ?? "").trim();
    if (!rawLabel) return `Column_${j + 1}`;
    const canonical = canonicalizeHeader(rawLabel);
    if ((canonical === "Name" || canonical === "Phone") && usedCanonical.has(canonical)) {
      return `Column_${j + 1}`;
    }
    if (canonical === "Name" || canonical === "Phone") usedCanonical.add(canonical);
    return canonical || `Column_${j + 1}`;
  });

  const leads = [];

  for (let i = headerRowIndex + 1; i < raw.length; i++) {
    const row = raw[i] ?? [];
    const obj = {};
    headers.forEach((key, j) => {
      if (!key.startsWith("Column_")) obj[key] = trimCellValue(row[j]);
    });
    if (isLeadDataRow(obj)) leads.push(obj);
  }

  return leads;
}

/** Parse all sheets from an Excel workbook into one leads array */
export function parseLeadsWorkbook(workbook) {
  const all = [];
  for (const sheetName of workbook.SheetNames) {
    const sheetLeads = parseLeadsWorksheet(workbook.Sheets[sheetName]);
    all.push(...sheetLeads);
  }
  return all;
}

function normalizeMobileDigits(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function cleanExcelPhone(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizeMobileDigits(String(Math.trunc(value)));
  }
  let s = trimCellValue(value, { collapseInner: false }).replace(/\s+/g, "");
  if (!s) return "";
  if (s.toLowerCase().startsWith("p:")) s = s.slice(2).trim();
  return normalizeMobileDigits(s);
}

function parseAddedTime(value) {
  const raw = trimCellValue(value, { collapseInner: false });
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

/**
 * Map one parsed Excel row to bulk-create API shape.
 * Source must be passed via `selectedSource` from the UI dropdown (never from Excel).
 */
export function mapExcelRowToLeadPayload(row, salesPersonId, { selectedSource, relatedType = "none" } = {}) {
  const name = trimCellValue(getRowValue(row, "Name"));
  const mobile = cleanExcelPhone(getRowValue(row, "Phone"));
  const email = trimCellValue(getRowValue(row, "Email"));
  const next_follow_up_at = parseAddedTime(getRowValue(row, "Added Time"));

  const payload = {
    sales_person: salesPersonId,
    name,
    mobile,
    email,
    status: "new",
    source: selectedSource,
    is_related: relatedType || "none",
    referred_by_name: trimCellValue(getRowValue(row, "Referred By")) || "",
    referred_by_batch: trimCellValue(getRowValue(row, "Referred By Batch")) || "",
  };
  if (next_follow_up_at) payload.next_follow_up_at = next_follow_up_at;
  return payload;
}

/** Validate one Excel row; returns missing field labels for UI. */
export function validateExcelLeadRow(row) {
  const name = trimCellValue(getRowValue(row, "Name"));
  const mobile = cleanExcelPhone(getRowValue(row, "Phone"));
  const email = trimCellValue(getRowValue(row, "Email"));
  const missing = [];

  if (!name) missing.push("Name");
  if (!mobile) missing.push("Phone");
  else if (mobile.length !== 10) missing.push("Valid 10-digit Phone");

  return {
    name: name || "—",
    mobile: mobile || "—",
    email: email || "—",
    missing,
    isValid: missing.length === 0,
  };
}

/** Build preview rows for bulk import UI (keeps invalid rows visible). */
export function prepareBulkLeadImportRows(rows, salesPersonId, { selectedSource, relatedType = "none" } = {}) {
  if (!salesPersonId) return [];
  return rows.map((row, index) => {
    const validation = validateExcelLeadRow(row);
    const canBuildPayload = validation.isValid && Boolean(selectedSource);
    return {
      rowNumber: index + 1,
      raw: row,
      validation,
      payload: canBuildPayload
        ? mapExcelRowToLeadPayload(row, salesPersonId, { selectedSource, relatedType })
        : null,
    };
  });
}

/** Map parsed Excel rows; only rows that pass validation. */
export function mapLeadsExcelToBulkPayload(rows, salesPersonId, options = {}) {
  return prepareBulkLeadImportRows(rows, salesPersonId, options)
    .filter((item) => item.payload)
    .map((item) => item.payload);
}
