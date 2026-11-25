// The ready-made tests. Each one pre-fills the "New test" flow, so the user can
// run it as is or edit anything first. They target the public DummyJSON demo API.
import { applyTestType, emptyAuth, emptyForm, newStep, uid, withIds, type StepForm, type TestForm } from './form';
import { FUNCTIONAL_THRESHOLDS } from './presets';
import type { TemplateIconKey } from './icons';
import type { CheckDef, TestType } from './types';

export type TemplateCategory = 'quick' | 'workflow' | 'performance';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  summary: string;
  icon: TemplateIconKey;
  testType: TestType;
  build: () => TestForm;
}

const DEMO = 'https://dummyjson.com';
const status = (value: string): CheckDef => ({ type: 'status', value });
const jsonEq = (path: string, value: string): CheckDef => ({ type: 'json', path, value });
const exists = (path: string): CheckDef => ({ type: 'exists', path });

function step(p: Partial<Omit<StepForm, 'checks' | 'id'>> & { name: string; path: string; checks?: CheckDef[] }): StepForm {
  const { checks, ...rest } = p;
  return newStep({ ...rest, checks: withIds(checks ?? [status('200')]) });
}

function form(name: string, type: TestType, steps: StepForm[], extra: Partial<TestForm> = {}): TestForm {
  const base: TestForm = { ...emptyForm(), name, baseUrl: DEMO, steps, ...extra };
  return applyTestType(base, type);
}

const listSteps = (): StepForm[] => [step({ name: 'List products', path: '/products', checks: [status('200'), exists('$.products[0]')] })];

export const TEMPLATES: Template[] = [
  {
    id: 'smoke-get', name: 'Smoke: fetch a product', category: 'quick', icon: 'smoke', testType: 'smoke',
    description: 'Sanity check. Fetch one product and verify the status and the fields.',
    summary: 'GET /products/1',
    build: () => form('Smoke: fetch a product', 'smoke', [
      step({ name: 'Get product', path: '/products/1', checks: [status('200'), jsonEq('$.id', '1'), exists('$.title')] })
    ])
  },
  {
    id: 'auth', name: 'Login and protected call', category: 'quick', icon: 'auth', testType: 'smoke',
    description: 'Log in, keep the token from the response, then call a protected endpoint with it.',
    summary: 'POST /auth/login, GET /auth/me',
    build: () => form('Login and protected call', 'smoke', [
      step({
        name: 'Log in', method: 'POST', path: '/auth/login', useAuth: false,
        body: '{\n  "username": "emilys",\n  "password": "emilyspass"\n}',
        extract: withIds([{ name: 'token', path: '$.accessToken' }]),
        checks: [status('200')]
      }),
      step({
        name: 'Get my profile', path: '/auth/me', useAuth: false,
        headers: [{ id: uid(), k: 'Authorization', v: 'Bearer {{vars.token}}', on: true }],
        checks: [status('200'), jsonEq('$.username', 'emilys')]
      })
    ], { auth: emptyAuth() })
  },
  {
    id: 'search', name: 'Search with test data', category: 'quick', icon: 'search', testType: 'smoke',
    description: 'Run one search per row of a small data file and verify results come back.',
    summary: 'GET /products/search?q={{data.q}}',
    build: () => form('Search with test data', 'smoke', [
      step({ name: 'Search', path: '/products/search?q={{data.q}}', checks: [status('200'), exists('$.products[0]')] })
    ], { dataText: 'q\nphone\nlaptop\nmascara', dataMode: 'sequential' })
  },
  {
    id: 'post', name: 'POST: create a product', category: 'quick', icon: 'post', testType: 'smoke',
    description: 'Send a JSON payload and verify the response body echoes it back.',
    summary: 'POST /products/add',
    build: () => form('POST: create a product', 'smoke', [
      step({
        name: 'Create product', method: 'POST', path: '/products/add',
        body: '{\n  "title": "Pulsar Test Product",\n  "price": 99,\n  "category": "software"\n}',
        checks: [status('201'), jsonEq('$.title', 'Pulsar Test Product'), exists('$.id')]
      })
    ])
  },
  {
    id: 'put', name: 'PUT: replace a product', category: 'quick', icon: 'put', testType: 'smoke',
    description: 'Replace a product and verify the updated fields.',
    summary: 'PUT /products/1',
    build: () => form('PUT: replace a product', 'smoke', [
      step({
        name: 'Replace product', method: 'PUT', path: '/products/1',
        body: '{\n  "title": "Pulsar Updated Product",\n  "price": 149\n}',
        checks: [status('200'), jsonEq('$.title', 'Pulsar Updated Product'), jsonEq('$.price', '149')]
      })
    ])
  },
  {
    id: 'patch', name: 'PATCH: update a field', category: 'quick', icon: 'patch', testType: 'smoke',
    description: 'Change a single field and verify it.',
    summary: 'PATCH /products/1',
    build: () => form('PATCH: update a field', 'smoke', [
      step({
        name: 'Update title', method: 'PATCH', path: '/products/1',
        body: '{\n  "title": "Pulsar Updated Title"\n}',
        checks: [status('200'), jsonEq('$.title', 'Pulsar Updated Title')]
      })
    ])
  },
  {
    id: 'delete', name: 'DELETE: remove a product', category: 'quick', icon: 'delete', testType: 'smoke',
    description: 'Delete a product and confirm it is marked deleted.',
    summary: 'DELETE /products/1',
    build: () => form('DELETE: remove a product', 'smoke', [
      step({ name: 'Delete product', method: 'DELETE', path: '/products/1', checks: [status('200'), jsonEq('$.id', '1'), jsonEq('$.isDeleted', 'true')] })
    ])
  },
  {
    id: 'workflow', name: 'CRUD workflow', category: 'workflow', icon: 'workflow', testType: 'custom',
    description: 'A full journey: read, create, replace, update and delete, repeated by 2 users for about 1 minute 40 seconds.',
    summary: 'GET, POST, PUT, PATCH, DELETE',
    build: () => {
      const f = form('CRUD workflow', 'custom', [
        step({ name: 'Read', path: '/products/1', checks: [status('200')] }),
        step({ name: 'Create', method: 'POST', path: '/products/add', body: '{\n  "title": "Pulsar Test Product",\n  "price": 99\n}', checks: [status('201')] }),
        step({ name: 'Replace', method: 'PUT', path: '/products/1', body: '{\n  "title": "Pulsar Updated Product",\n  "price": 149\n}', checks: [status('200')] }),
        step({ name: 'Update', method: 'PATCH', path: '/products/1', body: '{\n  "title": "Pulsar Patched Product"\n}', checks: [status('200')] }),
        step({ name: 'Delete', method: 'DELETE', path: '/products/1', checks: [status('200'), jsonEq('$.isDeleted', 'true')] })
      ]);
      return {
        ...f,
        load: { mode: 'stages', vus: 2, iterations: 5, duration: '1m', rate: 5, think: 1, stages: withIds([{ duration: '20s', target: 2 }, { duration: '1m', target: 2 }, { duration: '20s', target: 0 }]) },
        thresholds: withIds(FUNCTIONAL_THRESHOLDS)
      };
    }
  },
  {
    id: 'load', name: 'Load test', category: 'performance', icon: 'load', testType: 'load',
    description: 'Expected traffic: 5 virtual users for about 2 minutes against a list endpoint.',
    summary: 'GET /products · 5 users',
    build: () => form('Load test', 'load', listSteps())
  },
  {
    id: 'stress', name: 'Stress test', category: 'performance', icon: 'stress', testType: 'stress',
    description: 'Step the load up to 15 virtual users to find where response times start to suffer.',
    summary: 'GET /products · up to 15 users',
    build: () => form('Stress test', 'stress', listSteps())
  },
  {
    id: 'spike', name: 'Spike test', category: 'performance', icon: 'spike', testType: 'spike',
    description: 'A sudden jump from 2 to 15 virtual users and back, to see how the API recovers.',
    summary: 'GET /products · spike to 15 users',
    build: () => form('Spike test', 'spike', listSteps())
  },
  {
    id: 'soak', name: 'Soak test', category: 'performance', icon: 'soak', testType: 'soak',
    description: 'A steady 3 virtual users for 3 minutes to catch slow degradation.',
    summary: 'GET /products · 3 users · 3 min',
    build: () => form('Soak test', 'soak', listSteps())
  }
];

export const CATEGORIES: { id: TemplateCategory; title: string; blurb: string }[] = [
  { id: 'quick', title: 'Quick checks', blurb: 'Finish in seconds. Safe to run any time.' },
  { id: 'workflow', title: 'Workflows', blurb: 'Chained requests that behave like a real user journey.' },
  { id: 'performance', title: 'Performance', blurb: 'Ramp up virtual users. Only run these against APIs you own or may test.' }
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
