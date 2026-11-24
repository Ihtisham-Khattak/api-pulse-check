import { check } from 'k6';
import { currentEnvironment } from '../config/environments.js';
import { functionalThresholds } from '../config/thresholds.js';
import { del } from '../utils/requests.js';
import { jsonField } from '../utils/checks.js';
import { generateReport } from '../utils/reporting.js';

export const options = {
    vus: 1,
    iterations: 1,
    thresholds: functionalThresholds
};

export default function () {
    const response = del(`${currentEnvironment.baseUrl}/products/1`);

    check(response, {
        'Status code is 200': (r) => r.status === 200,
        'Product ID is 1': (r) => jsonField(r, 'id') === 1,
        'Product is deleted': (r) => jsonField(r, 'isDeleted') === true
    });
}

export function handleSummary(data) {
    return generateReport(data, 'delete-test');
}
