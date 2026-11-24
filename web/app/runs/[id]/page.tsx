import type { Metadata } from 'next';
import { RunPage } from '@/components/RunPage';

export const metadata: Metadata = { title: 'Test run' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RunPage key={id} id={id} />;
}
