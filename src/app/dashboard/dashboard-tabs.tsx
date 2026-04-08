'use client';

import { useState, type ReactNode } from 'react';
import ReadByTyping from '@/components/ReadByTyping';

type Tab = 'topics' | 'read';

export default function DashboardTabs({ topicsContent }: { topicsContent: ReactNode }) {
  const [activeTab, setActiveTab] = useState<Tab>('topics');

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-6 mb-10 border-b" style={{ borderColor: '#2c2e31' }}>
        <button
          onClick={() => setActiveTab('topics')}
          className="pb-2 text-sm transition-colors"
          style={{
            color: activeTab === 'topics' ? '#e2b714' : '#646669',
            borderBottom: activeTab === 'topics' ? '2px solid #e2b714' : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          topics
        </button>
        <button
          onClick={() => setActiveTab('read')}
          className="pb-2 text-sm transition-colors"
          style={{
            color: activeTab === 'read' ? '#e2b714' : '#646669',
            borderBottom: activeTab === 'read' ? '2px solid #e2b714' : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          read by typing
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'topics' ? (
        topicsContent
      ) : (
        <ReadByTyping backHref="/dashboard" backLabel="dashboard" />
      )}
    </>
  );
}
