// One place that decides which icon means what, so the app stays consistent.
import {
  ArrowDownToLine,
  CircleCheck,
  CircleX,
  CirclePlus,
  Flame,
  Gauge,
  Hourglass,
  KeyRound,
  OctagonX,
  Pencil,
  Replace,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Workflow,
  Zap,
  type LucideIcon
} from 'lucide-react';
import type { RunStatus, TestType } from './types';

export const TEMPLATE_ICONS = {
  get: ArrowDownToLine,
  auth: KeyRound,
  search: Search,
  post: CirclePlus,
  put: Replace,
  patch: Pencil,
  delete: Trash2,
  workflow: Workflow,
  load: Gauge,
  stress: TrendingUp,
  spike: Zap,
  soak: Hourglass,
  smoke: Flame
} satisfies Record<string, LucideIcon>;

export type TemplateIconKey = keyof typeof TEMPLATE_ICONS;

export const TEST_TYPE_ICON: Record<TestType, LucideIcon> = {
  smoke: Flame,
  load: Gauge,
  stress: TrendingUp,
  spike: Zap,
  soak: Hourglass,
  custom: SlidersHorizontal
};

export const STATUS_ICON: Record<RunStatus, LucideIcon> = {
  running: Gauge,
  passed: CircleCheck,
  failed: CircleX,
  stopped: OctagonX,
  error: TriangleAlert
};

export const STATUS_LABEL: Record<RunStatus, string> = {
  running: 'Running',
  passed: 'Passed',
  failed: 'Failed',
  stopped: 'Stopped',
  error: 'Error'
};
