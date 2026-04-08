import { ReactNode } from 'react';
import { GenerationProvider } from './generation-context';
import GenerationBanner from './generation-banner';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <GenerationProvider>
      <div className="pt-6">
        <GenerationBanner />
      </div>
      {children}
    </GenerationProvider>
  );
}
