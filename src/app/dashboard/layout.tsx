import { ReactNode } from 'react';
import { GenerationProvider } from './generation-context';
import GenerationBanner from './generation-banner';
import { FontToggle } from '@/components/FontToggle';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <GenerationProvider>
      <div className="flex justify-end px-8 pt-4">
        <FontToggle />
      </div>
      <div className="pt-2">
        <GenerationBanner />
      </div>
      {children}
    </GenerationProvider>
  );
}
