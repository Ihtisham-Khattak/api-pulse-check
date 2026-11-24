import { check, fail } from 'k6';
import { currentEnvironment } from '../config/environments.js';
import { functionalThresholds } from '../config/thresholds.js';
import { post, get } from '../utils/requests.js';
import { getAuthHeaders } from '../utils/auth.js';
import { jsonField } from '../utils/checks.js';
import { generateReport } from '../utils/reporting.js';

export const options = {
    vus: 1,
    iterations: 1,
    thresholds: functionalThresholds
};

// Defaults are DummyJSON's public demo credentials.
// Override with: k6 run -e AUTH_USERNAME=... -e AUTH_PASSWORD=... tests/auth-test.js
const USERNAME = __ENV.AUTH_USERNAME || 'emilys';
const PASSWORD = __ENV.AUTH_PASSWORD || 'emilyspass';

export function setup() {
    const response = post(
        `${currentEnvironment.baseUrl}/auth/login`,
        { username: USERNAME, password: PASSWORD }
    );

    const loggedIn = check(response, {
        'Login successful': (r) => r.status === 200,
        'Access token received': (r) => !!jsonField(r, 'accessToken')
    });

    if (!loggedIn) {
        fail(`Login failed with status ${response.status}; aborting test.`);
    }

    return {
        token: jsonField(response, 'accessToken')
    };
}

export default function (data) {
    const response = get(
        `${currentEnvironment.baseUrl}/auth/me`,
        getAuthHeaders(data.token)
    );

    check(response, {
        'Authenticated request successful': (r) => r.status === 200,
        'Username is correct': (r) => jsonField(r, 'username') === USERNAME
    });
}

export function handleSummary(data) {
    return generateReport(data, 'auth-test');
}
