import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TypeWise',
  description: 'Learn topics while you type.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
