import type { Metadata } from 'next';
import { StagingBanner } from '@/components/StagingBanner';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import '@fontsource/opendyslexic';
import '@fontsource/opendyslexic/400-italic.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'TyperFocus',
  description: 'Learn topics while you type.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AccessibilityProvider>
          <StagingBanner />
          {children}
        </AccessibilityProvider>
      </body>
    </html>
  );
}
