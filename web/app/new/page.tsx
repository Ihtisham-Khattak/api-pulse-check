import type { Metadata } from 'next';
import { NewTest } from '@/components/wizard/NewTest';

export const metadata: Metadata = { title: 'New test' };

export default async function NewTestPage({ searchParams }: { searchParams: Promise<{ template?: string; from?: string }> }) {
  const { template, from } = await searchParams;
  // key makes React start fresh when the user picks a different template
  return <NewTest key={`${template ?? ''}|${from ?? ''}`} templateId={template} fromId={from} />;
}
