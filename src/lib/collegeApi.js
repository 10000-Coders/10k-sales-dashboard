import coreApi from "@/lib/coreApi";

/**
 * List colleges from 10kCoders mentor `GET /mentor/new-colleges/`.
 * Response: { data: [{ id, college_code, college_name }], metadata }
 */
export async function fetchCollegeNames({ search = "", page = 1, pageSize = 50 } = {}) {
  const { data } = await coreApi.get("/mentor/new-colleges/", {
    params: {
      search: search || undefined,
      page,
      page_size: pageSize,
    },
  });
  const colleges = Array.isArray(data?.data) ? data.data : [];
  return {
    colleges,
    metadata: data?.metadata || {},
  };
}
