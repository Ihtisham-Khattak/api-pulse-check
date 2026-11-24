import { check } from 'k6';
import { currentEnvironment } from '../config/environments.js';
import { stressThresholds } from '../config/thresholds.js';
import { get } from '../utils/requests.js';
import { jsonField } from '../utils/checks.js';
import { generateReport } from '../utils/reporting.js';

export const options = {
    stages: [
        { duration: '30s', target: 2 },
        { duration: '30s', target: 5 },
        { duration: '30s', target: 10 },
        { duration: '30s', target: 15 },
        { duration: '30s', target: 0 }
    ],

    thresholds: stressThresholds
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
    return generateReport(data, 'stress-test');
}
