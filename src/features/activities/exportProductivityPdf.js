import axios from "@/axios";

function filenameFromDisposition(disposition, fallback) {
  const match = /filename="?([^";]+)"?/i.exec(disposition || "");
  return match?.[1] || fallback;
}

async function messageFromBlobError(error) {
  const data = error?.response?.data;
  if (!data) return error?.message || "Failed to export PDF";
  try {
    const text = typeof data.text === "function" ? await data.text() : String(data);
    const parsed = JSON.parse(text);
    return parsed?.detail || "Failed to export PDF";
  } catch {
    return "Failed to export PDF";
  }
}

/**
 * Download Activities & productivity / person analytics PDF.
 * @param {object} options
 * @param {string} options.from - YYYY-MM-DD
 * @param {string} options.to - YYYY-MM-DD
 * @param {string|number} [options.salesPersonId] - single person (person analytics sheet)
 * @param {Array<string|number>} [options.salesPersonIds] - team multi-select filter
 * @param {boolean} [options.includeCharts=false]
 * @param {Record<string, string>} [options.headers]
 * @param {string} [options.filename]
 */
export async function exportProductivityPdf({
  from,
  to,
  salesPersonId,
  salesPersonIds = [],
  includeCharts = false,
  headers = {},
  filename,
} = {}) {
  const params = new URLSearchParams({
    from,
    to,
    include_charts: includeCharts ? "1" : "0",
  });
  if (salesPersonId != null && salesPersonId !== "") {
    params.set("sales_person", String(salesPersonId));
  } else if (salesPersonIds?.length) {
    params.set("sales_person_ids", salesPersonIds.map(String).join(","));
  }

  let response;
  try {
    response = await axios.get(`/stats/range/export-pdf/?${params.toString()}`, {
      headers,
      responseType: "blob",
    });
  } catch (error) {
    throw new Error(await messageFromBlobError(error));
  }

  const downloadName =
    filename ||
    filenameFromDisposition(
      response.headers?.["content-disposition"],
      salesPersonId
        ? `activity-analytics-${from}-to-${to}.pdf`
        : `activities-productivity-${from}-to-${to}.pdf`
    );

  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
