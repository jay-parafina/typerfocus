export function StagingBanner() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview') return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 text-center text-xs py-1 font-medium"
      style={{ backgroundColor: '#e2b714', color: '#323437' }}
    >
      STAGING ENVIRONMENT
    </div>
  );
}
