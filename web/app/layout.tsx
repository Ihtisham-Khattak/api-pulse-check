import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { FeedbackProvider } from '@/components/Feedback';
import { Shell } from '@/components/Shell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Pulsar', template: '%s · Pulsar' },
  description: 'Run API performance tests with k6 and read the results in one place.'
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#ffffff' }, { media: '(prefers-color-scheme: dark)', color: '#0a0f0c' }]
};

// Runs before first paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem('pc-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <FeedbackProvider>
          <Shell>{children}</Shell>
        </FeedbackProvider>
      </body>
    </html>
  );
}
