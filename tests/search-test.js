import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { currentEnvironment } from '../config/environments.js';
import { functionalThresholds } from '../config/thresholds.js';
import { get } from '../utils/requests.js';
import { validateStatus, validateJson, jsonField } from '../utils/checks.js';
import { generateReport } from '../utils/reporting.js';

const testData = new SharedArray('search test data', function () {
    return [JSON.parse(open('../data/test-data.json'))];
});

export const options = {
    vus: 1,
    iterations: 3,
    thresholds: functionalThresholds
};

export default function () {
    const queries = testData[0].searchQueries;
    const searchQuery = queries[__ITER % queries.length];

    const response = get(
        `${currentEnvironment.baseUrl}/products/search?q=${encodeURIComponent(searchQuery)}`
    );

    validateStatus(response, 200);
    validateJson(response);

    check(response, {
        'Search returns products': (r) =>
            (jsonField(r, 'products') || []).length > 0,
        'Search query is present': (r) =>
            (jsonField(r, 'products') || []).some(
                (product) =>
                    String(product.title).toLowerCase().includes(searchQuery.toLowerCase())
            )
    });
}

export function handleSummary(data) {
    return generateReport(data, 'search-test');
}
