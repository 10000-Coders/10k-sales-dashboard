import coreApi from '@/lib/coreApi';
import { sortUniqueBatchNames } from '@/utils/sortBatchNames';

const appendArrayParam = (queryParams, key, value = []) => {
    if (Array.isArray(value) && value.length > 0) {
        queryParams.append(key, value.join(','));
    }
};

const buildStudentQueryParams = (params = {}) => {
    const {
        search = '',
        mode = '',
        branches = [],
        statuses = [],
        pass_years = [],
        batches = [],
        colleges = [],
        placed = null,
        has_reference = null,
        include_deleted = false,
        page = 1,
        page_size = 25,
        sort_by = 'student_name',
        sort_order = 'asc',
    } = params;

    const queryParams = new URLSearchParams();

    if (search) queryParams.append('search', search);
    if (mode && mode !== 'All') queryParams.append('mode', mode);

    appendArrayParam(queryParams, 'branches', branches);
    appendArrayParam(queryParams, 'statuses', statuses);
    appendArrayParam(queryParams, 'pass_years', pass_years);
    appendArrayParam(queryParams, 'batches', batches);
    appendArrayParam(queryParams, 'colleges', colleges);

    if (placed !== null && placed !== undefined) {
        queryParams.append('placed', String(placed));
    }

    if (has_reference !== null && has_reference !== undefined) {
        queryParams.append('has_reference', String(has_reference));
    }

    if (include_deleted) {
        queryParams.append('include_deleted', 'true');
    }

    queryParams.append('page', String(page));
    queryParams.append('page_size', String(page_size));
    queryParams.append('sort_by', sort_by);
    queryParams.append('sort_order', sort_order);

    return queryParams.toString();
};

export const getAllStudents = async (params = {}, config = {}) => {
    const queryString = buildStudentQueryParams(params);
    const response = await coreApi.get(`/mentor/students/all/?${queryString}`, config);
    return response.data;
};

/** All batches for dropdowns via mentor API (no 50-item cap), returned in sorted order. */
export async function getAllBatchNames(config = {}) {
    const response = await coreApi.get('/mentor/batches/all/', config);
    const results = Array.isArray(response.data?.results) ? response.data.results : [];
    const names = results
        .filter((batch) => !batch?.is_deleted)
        .map((batch) => batch.batch_name);
    return sortUniqueBatchNames(names);
}

export default getAllStudents;