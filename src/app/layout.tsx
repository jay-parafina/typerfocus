import type { Metadata } from 'next';
import { StagingBanner } from '@/components/StagingBanner';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import '@fontsource/opendyslexic';
import '@fontsource/opendyslexic/400-italic.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://typerfocus.co'),
  title: { default: 'TyperFocus', template: '%s · TyperFocus' },
  description: 'E-learning, rebuilt for neurodivergent minds.',
  openGraph: {
    title: 'TyperFocus',
    description: 'E-learning, rebuilt for neurodivergent minds.',
    url: 'https://typerfocus.co',
    siteName: 'TyperFocus',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TyperFocus',
    description: 'E-learning, rebuilt for neurodivergent minds.',
  },
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
