import { check } from 'k6';
import { currentEnvironment } from '../config/environments.js';
import { get } from '../utils/requests.js';
import { loadThresholds } from '../config/thresholds.js';
import { jsonField } from '../utils/checks.js';
import { generateReport } from '../utils/reporting.js';

import {
    apiResponseTime,
    successfulRequests,
    failedRequests,
    businessFailureRate
} from '../utils/metrics.js';

export const options = {
    stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 }
    ],

    thresholds: loadThresholds
};

export default function () {
    const response = get(
        `${currentEnvironment.baseUrl}/products`
    );

    apiResponseTime.add(response.timings.duration);

    const requestSucceeded = response.status === 200;

    if (requestSucceeded) {
        successfulRequests.add(1);
    } else {
        failedRequests.add(1);
    }

    const businessCheck = check(response, {
        'Products are returned': (r) =>
            r.status === 200 &&
            (jsonField(r, 'products') || []).length > 0
    });

    businessFailureRate.add(!businessCheck);
}

export function handleSummary(data) {
    return generateReport(data, 'load-test');
}
