import * as XLSX from "xlsx";

/** Trim Excel cells: NBSP → space, collapse repeated spaces, strip ends. */
export function trimCellValue(value, { collapseInner = true } = {}) {
  let s = String(value ?? "")
    .replace(/\u00a0/g, " ")
    .trim();
  if (collapseInner) s = s.replace(/\s+/g, " ");
  return s;
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
  const name = String(row.Name ?? "").trim();
  const phone = String(row.Phone ?? "").trim();

  if (!name && !phone) return false;
  if (name.toLowerCase() === "name") return false;
  if (isMonthSectionLabel(name) && !phone) return false;
  return true;
}

/**
 * Parse a leads worksheet: skip month/section rows, one object per data row.
 * Expects headers on the row where column A is "Name" (usually row 2).
 */
export function parseLeadsWorksheet(worksheet) {
  const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (!raw.length) return [];

  let headerRowIndex = raw.findIndex(
    (row) => String(row[0] ?? "").trim().toLowerCase() === "name"
  );
  if (headerRowIndex === -1) headerRowIndex = 1;

  const headerRow = raw[headerRowIndex];
  const colCount = Math.max(
    headerRow.length,
    ...raw.slice(headerRowIndex + 1).map((r) => r.length)
  );
  const headers = Array.from({ length: colCount }, (_, j) => {
    const label = String(headerRow[j] ?? "").trim();
    return label || `Column_${j + 1}`;
  });
  const leads = [];

  for (let i = headerRowIndex + 1; i < raw.length; i++) {
    const row = raw[i];
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
 * Columns: Name, Phone, Email, Added Time, Related (yes → is_related).
 */
export function mapExcelRowToLeadPayload(row, salesPersonId) {
  const name = trimCellValue(row.Name);
  const mobile = cleanExcelPhone(row.Phone ?? row.phone);
  const email = trimCellValue(row.Email);
  const next_follow_up_at = parseAddedTime(row["Added Time"] ?? row["Added time"]);

  const payload = {
    sales_person: salesPersonId,
    name,
    mobile,
    email,
    status: "new",
    source: "website",
    is_related: true,
  };
  if (next_follow_up_at) payload.next_follow_up_at = next_follow_up_at;
  return payload;
}

/** Map parsed Excel rows; drops rows missing name or mobile. */
export function mapLeadsExcelToBulkPayload(rows, salesPersonId) {
  if (!salesPersonId) return [];
  return rows
    .map((row) => mapExcelRowToLeadPayload(row, salesPersonId))
    .filter((lead) => lead.name && lead.mobile);
}
