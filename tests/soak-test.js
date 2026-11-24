import { check } from 'k6';
import { currentEnvironment } from '../config/environments.js';
import { soakThresholds } from '../config/thresholds.js';
import { get } from '../utils/requests.js';
import { jsonField } from '../utils/checks.js';
import { generateReport } from '../utils/reporting.js';

export const options = {
    stages: [
        { duration: '30s', target: 3 },
        { duration: '2m', target: 3 },
        { duration: '30s', target: 0 }
    ],

    thresholds: soakThresholds
};

export default function () {
    const response = get(
        `${currentEnvironment.baseUrl}/products`
    );

    check(response, {
        'Status is 200': (r) => r.status === 200,
        'Products are returned': (r) =>
            (jsonField(r, 'products') || []).length > 0
    });
}

export function handleSummary(data) {
    return generateReport(data, 'soak-test');
}
