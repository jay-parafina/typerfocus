import type { Metadata } from 'next';
import { StagingBanner } from '@/components/StagingBanner';
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
        <StagingBanner />
        {children}
      </body>
    </html>
  );
}
