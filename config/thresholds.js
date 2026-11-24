// Baseline thresholds shared by most scenarios.
// These are configurable starting targets, not universal performance standards.
export const thresholds = {
    http_req_duration: [
        'avg<500',
        'p(90)<800',
        'p(95)<1000',
        'p(99)<1500'
    ],

    http_req_failed: [
        'rate<0.01'
    ],

    checks: [
        'rate>0.95'
    ]
};

// Smoke: tiny run, so every check must pass and latency is loosely bounded.
export const smokeThresholds = {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate==1']
};

// Functional (single-request / workflow) tests: correctness first.
export const functionalThresholds = {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate==1']
};

// Load: expected traffic, so the strict baseline applies.
export const loadThresholds = {
    ...thresholds,
    api_response_time: ['p(95)<1000'],
    business_failure_rate: ['rate<0.05']
};

// Stress: pushing the system, so latency is allowed to degrade somewhat.
export const stressThresholds = {
    http_req_duration: ['p(95)<2000', 'p(99)<3000'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.90']
};

// Spike: sudden surge, so the tolerance is similar to stress.
export const spikeThresholds = {
    http_req_duration: ['p(95)<2500', 'p(99)<4000'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.90']
};

// Soak: long, steady run, so the baseline applies and stability matters most.
export const soakThresholds = {
    http_req_duration: ['p(95)<1000', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.95']
};
