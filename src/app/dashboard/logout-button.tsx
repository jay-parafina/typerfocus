'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg px-6 py-3 text-sm font-medium transition-all hover:opacity-90"
      style={{ backgroundColor: '#2c2e31', color: '#d1d0c5', border: '1px solid #3d3f42' }}
    >
      log out
    </button>
  );
}
