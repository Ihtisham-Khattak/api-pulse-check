import { check } from 'k6';
import { currentEnvironment } from '../config/environments.js';
import { functionalThresholds } from '../config/thresholds.js';
import { patch } from '../utils/requests.js';
import { jsonField } from '../utils/checks.js';
import { generateReport } from '../utils/reporting.js';

export const options = {
    vus: 1,
    iterations: 1,
    thresholds: functionalThresholds
};

export default function () {
    const payload = {
        title: 'Pulsar Updated Title'
    };

    const response = patch(`${currentEnvironment.baseUrl}/products/1`, payload);

    check(response, {
        'Status is 200': (r) => r.status === 200,
        'Product title updated': (r) => jsonField(r, 'title') === payload.title
    });
}

export function handleSummary(data) {
    return generateReport(data, 'patch-test');
}
