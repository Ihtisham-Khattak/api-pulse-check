import type { LoadConfig, TestType, ThresholdDef } from './types';

export interface TestTypeInfo {
  id: Exclude<TestType, 'custom'>;
  label: string;
  tagline: string;
  detail: string;
  heavy: boolean;
  load: LoadConfig;
  thresholds: ThresholdDef[];
}

const thr = (metric: string, stat: string, op: string, value: number): ThresholdDef => ({ metric, stat, op, value, abort: false });
const stages = (...pairs: [string, number][]) => pairs.map(([duration, target]) => ({ duration, target }));

// These mirror config/thresholds.js. Values are starting targets, not universal standards.
export const TEST_TYPE_PRESETS: TestTypeInfo[] = [
  {
    id: 'smoke',
    label: 'Smoke',
    tagline: 'Does it work at all?',
    detail: 'One user, a handful of iterations. Every check must pass.',
    heavy: false,
    load: { mode: 'iterations', vus: 1, iterations: 5, duration: '30s', rate: 5, stages: [], think: 0 },
    thresholds: [thr('http_req_duration', 'p(95)', '<', 1500), thr('http_req_failed', 'rate', '<', 0.01), thr('checks', 'rate', '==', 1)]
  },
  {
    id: 'load',
    label: 'Load',
    tagline: 'Expected traffic',
    detail: '5 users for about 2 minutes with the strict baseline.',
    heavy: true,
    load: { mode: 'stages', vus: 5, iterations: 5, duration: '1m', rate: 5, stages: stages(['30s', 5], ['1m', 5], ['30s', 0]), think: 1 },
    thresholds: [
      thr('http_req_duration', 'avg', '<', 500),
      thr('http_req_duration', 'p(90)', '<', 800),
      thr('http_req_duration', 'p(95)', '<', 1000),
      thr('http_req_duration', 'p(99)', '<', 1500),
      thr('http_req_failed', 'rate', '<', 0.01),
      thr('checks', 'rate', '>', 0.95)
    ]
  },
  {
    id: 'stress',
    label: 'Stress',
    tagline: 'Find the breaking point',
    detail: 'Steps up to 15 users. Latency may degrade; errors must stay under 5%.',
    heavy: true,
    load: { mode: 'stages', vus: 5, iterations: 5, duration: '1m', rate: 5, stages: stages(['30s', 2], ['30s', 5], ['30s', 10], ['30s', 15], ['30s', 0]), think: 1 },
    thresholds: [thr('http_req_duration', 'p(95)', '<', 2000), thr('http_req_duration', 'p(99)', '<', 3000), thr('http_req_failed', 'rate', '<', 0.05), thr('checks', 'rate', '>', 0.9)]
  },
  {
    id: 'spike',
    label: 'Spike',
    tagline: 'Sudden surge',
    detail: 'Jumps from 2 to 15 users in 5 seconds, then back.',
    heavy: true,
    load: { mode: 'stages', vus: 5, iterations: 5, duration: '1m', rate: 5, stages: stages(['20s', 2], ['5s', 15], ['30s', 15], ['5s', 2], ['20s', 2], ['5s', 0]), think: 1 },
    thresholds: [thr('http_req_duration', 'p(95)', '<', 2500), thr('http_req_duration', 'p(99)', '<', 4000), thr('http_req_failed', 'rate', '<', 0.05), thr('checks', 'rate', '>', 0.9)]
  },
  {
    id: 'soak',
    label: 'Soak',
    tagline: 'Hold steady for longer',
    detail: '3 users for 3 minutes, to catch slow degradation.',
    heavy: true,
    load: { mode: 'stages', vus: 3, iterations: 5, duration: '2m', rate: 5, stages: stages(['30s', 3], ['2m', 3], ['30s', 0]), think: 1 },
    thresholds: [thr('http_req_duration', 'p(95)', '<', 1000), thr('http_req_duration', 'p(99)', '<', 1500), thr('http_req_failed', 'rate', '<', 0.01), thr('checks', 'rate', '>', 0.95)]
  }
];

export function presetFor(type: TestType): TestTypeInfo | undefined {
  return TEST_TYPE_PRESETS.find((p) => p.id === type);
}

export const FUNCTIONAL_THRESHOLDS: ThresholdDef[] = [
  thr('http_req_duration', 'p(95)', '<', 2000),
  thr('http_req_failed', 'rate', '<', 0.01),
  thr('checks', 'rate', '==', 1)
];

export const THRESHOLD_METRICS = [
  { id: 'http_req_duration', label: 'Response time (ms)' },
  { id: 'http_req_failed', label: 'Failed requests (rate)' },
  { id: 'checks', label: 'Checks passed (rate)' },
  { id: 'http_reqs', label: 'Total requests' },
  { id: 'iteration_duration', label: 'Iteration time (ms)' }
];

export const THRESHOLD_STATS = ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'rate', 'count'];
