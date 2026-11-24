import { check } from 'k6';
import { currentEnvironment } from '../config/environments.js';
import { functionalThresholds } from '../config/thresholds.js';
import { post } from '../utils/requests.js';
import { jsonField } from '../utils/checks.js';
import { generateReport } from '../utils/reporting.js';

export const options = {
    vus: 1,
    iterations: 1,
    thresholds: functionalThresholds
};

export default function () {
    const payload = {
        title: 'PulseCheck Test Product',
        price: 99,
        category: 'software'
    };

    const response = post(`${currentEnvironment.baseUrl}/products/add`, payload);

    check(response, {
        'Status is 201': (r) => r.status === 201,
        'Product title matches': (r) => jsonField(r, 'title') === payload.title,
        'Product has an ID': (r) => jsonField(r, 'id') !== undefined
    });
}

export function handleSummary(data) {
    return generateReport(data, 'post-test');
}
