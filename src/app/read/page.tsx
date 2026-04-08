'use client';

import Link from 'next/link';
import ReadByTyping from '@/components/ReadByTyping';

export default function ReadPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 py-16">
      {/* Back */}
      <div className="w-full max-w-2xl mb-10">
        <Link href="/" className="text-sm hover:text-[#d1d0c5] transition-colors" style={{ color: '#646669' }}>
          ← home
        </Link>
      </div>

      <ReadByTyping backHref="/" backLabel="home" />
    </div>
  );
}
