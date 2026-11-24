import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { currentEnvironment } from '../config/environments.js';
import { smokeThresholds } from '../config/thresholds.js';
import { get } from '../utils/requests.js';
import { validateStatus, validateJson, jsonField } from '../utils/checks.js';
import { generateReport } from '../utils/reporting.js';


const testData = new SharedArray('test data', function () {
    return [JSON.parse(open('../data/test-data.json'))];
});

export const options = {
    vus: 1,
    iterations: 5,
    thresholds: smokeThresholds
};

export default function () {
    const productIds = testData[0].productIds;
    const productId = productIds[__ITER % productIds.length];

    const response = get(
        `${currentEnvironment.baseUrl}/products/${productId}`
    );

    validateStatus(response, 200);
    validateJson(response);

    check(response, {
        'Product ID is correct': (r) => jsonField(r, 'id') === productId,
        'Product title exists': (r) => !!jsonField(r, 'title')
    });
}

export function handleSummary(data) {
    return generateReport(data, 'smoke-test');
}
