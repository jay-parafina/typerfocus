import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LeadForm } from '@/components/LeadForm';

export const metadata: Metadata = {
  title: 'TyperFocus — E-learning, rebuilt for neurodivergent minds.',
  description:
    'An adaptive learning platform designed from the ground up for neurodivergent thinkers. Currently in invite-only alpha.',
  openGraph: {
    title: 'TyperFocus — E-learning, rebuilt for neurodivergent minds.',
    description:
      'An adaptive learning platform designed from the ground up for neurodivergent thinkers. Currently in invite-only alpha.',
    url: 'https://typerfocus.co',
    siteName: 'TyperFocus',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TyperFocus — E-learning, rebuilt for neurodivergent minds.',
    description:
      'An adaptive learning platform designed from the ground up for neurodivergent thinkers. Currently in invite-only alpha.',
  },
};

const FEATURES = [
  {
    title: 'Active Kinesthetic Learning',
    body: 'You learn by typing, not by skimming. Reading sessions and module exercises engage motor memory alongside comprehension.',
  },
  {
    title: 'AI-Powered Content Generation',
    body: 'Drop in a topic, a PDF, or a transcript. TyperFocus produces structured study guides, practice modules, and quizzes in minutes.',
  },
  {
    title: 'Invite-Gated Alpha',
    body: 'A small, intentional cohort. The product evolves alongside the people using it, not in spite of them.',
  },
  {
    title: 'Neurodivergent-First Design',
    body: 'OpenDyslexic font support, calm dark theme, predictable interactions. Accessibility is the foundation, not an afterthought.',
  },
];

const VISION = [
  {
    title: 'Multi-Modal Learning',
    body: 'Read, type, listen, watch — choose the path that holds your attention today.',
  },
  {
    title: 'Adaptive AI',
    body: 'Content that adjusts to how you actually learn, not to a generic curriculum.',
  },
  {
    title: 'Accessibility as Foundation',
    body: 'Every control reachable by keyboard. Every setting tunable. Built for the way real minds work.',
  },
  {
    title: 'Tools Beyond E-learning',
    body: 'The same primitives that help you study can help you focus, plan, and create.',
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen">
      <nav
        className="flex items-center justify-between px-6 sm:px-10 py-6 fade-in"
        style={{ animationDelay: '0ms' }}
      >
        <span
          className="font-light tracking-[0.2em] text-lg"
          style={{ color: '#e2b714' }}
        >
          typerfocus
        </span>
        <div className="flex items-center gap-4 sm:gap-6 text-sm">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-lg px-4 py-2 font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#e2b714', color: '#323437' }}
            >
              dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="transition-colors hover:text-[#d1d0c5]"
                style={{ color: '#646669' }}
              >
                log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg px-4 py-2 font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#e2b714', color: '#323437' }}
              >
                sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      <section
        className="px-6 sm:px-10 pt-16 sm:pt-24 pb-24 max-w-4xl mx-auto fade-in"
        style={{ animationDelay: '80ms' }}
      >
        <p
          className="text-xs tracking-[0.3em] mb-6 uppercase"
          style={{ color: '#646669' }}
        >
          invite-only alpha
        </p>
        <h1
          className="text-4xl sm:text-6xl font-light leading-tight mb-6"
          style={{ color: '#d1d0c5' }}
        >
          E-learning, rebuilt for{' '}
          <span style={{ color: '#e2b714' }}>neurodivergent minds.</span>
        </h1>
        <p
          className="text-lg sm:text-xl leading-relaxed max-w-2xl"
          style={{ color: '#646669' }}
        >
          Most learning tools assume a brain that follows directions, sits still, and
          finishes the page. TyperFocus is built for the brain that doesn&apos;t — the one
          that learns through doing, jumps tracks, and needs the interface to be calm so
          the thinking can be loud.
        </p>
      </section>

      <section
        className="px-6 sm:px-10 py-16 max-w-5xl mx-auto fade-in"
        style={{ animationDelay: '160ms' }}
      >
        <h2
          className="text-2xl sm:text-3xl font-light tracking-[0.05em] mb-12"
          style={{ color: '#d1d0c5' }}
        >
          What it does today
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-lg p-6 transition-colors"
              style={{ backgroundColor: '#2c2e31', border: '1px solid #3d3f42' }}
            >
              <h3
                className="text-base font-medium mb-2"
                style={{ color: '#e2b714' }}
              >
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#d1d0c5' }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="px-6 sm:px-10 py-16 max-w-5xl mx-auto fade-in"
        style={{ animationDelay: '240ms' }}
      >
        <h2
          className="text-2xl sm:text-3xl font-light tracking-[0.05em] mb-4"
          style={{ color: '#d1d0c5' }}
        >
          The vision
        </h2>
        <p
          className="text-base leading-relaxed mb-12 max-w-2xl"
          style={{ color: '#646669' }}
        >
          Where this is headed — a full toolkit for neurodivergent thinkers, not just a
          typing app.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {VISION.map((v) => (
            <div
              key={v.title}
              className="rounded-lg p-6"
              style={{ backgroundColor: '#2c2e31', border: '1px solid #3d3f42' }}
            >
              <h3
                className="text-base font-medium mb-2"
                style={{ color: '#e2b714' }}
              >
                {v.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#d1d0c5' }}>
                {v.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="px-6 sm:px-10 py-16 max-w-3xl mx-auto fade-in"
        style={{ animationDelay: '320ms' }}
      >
        <h2
          className="text-2xl sm:text-3xl font-light tracking-[0.05em] mb-8"
          style={{ color: '#d1d0c5' }}
        >
          Origin story
        </h2>
        <div
          className="space-y-5 text-base leading-relaxed"
          style={{ color: '#d1d0c5' }}
        >
          <p>
            TyperFocus started while I was prepping for technical interviews and noticed
            something strange: the only times I actually retained material were when I
            typed it out word for word. Not summarizing. Not highlighting. Typing.
          </p>
          <p>
            The motor act of forming each word seemed to do something that passive
            reading didn&apos;t. So I started building a tool around that observation —
            and quickly realized the deeper problem.
          </p>
          <p style={{ color: '#646669' }}>
            Nothing in e-learning was designed for neurodivergent minds. Not the pacing.
            Not the visual density. Not the assumption that you&apos;d sit through a
            forty-minute video and remember any of it. TyperFocus is the version I
            wished existed.
          </p>
        </div>
      </section>

      <section
        id="contact"
        className="px-6 sm:px-10 py-16 max-w-5xl mx-auto fade-in"
        style={{ animationDelay: '400ms' }}
      >
        <h2
          className="text-2xl sm:text-3xl font-light tracking-[0.05em] mb-4"
          style={{ color: '#d1d0c5' }}
        >
          Get in touch
        </h2>
        <p
          className="text-base leading-relaxed mb-10 max-w-2xl"
          style={{ color: '#646669' }}
        >
          Open to collaborators, beta testers, and fellow builders. If any of this
          resonates, send a note.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <LeadForm />
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <p
                className="text-xs tracking-[0.2em] uppercase mb-2"
                style={{ color: '#646669' }}
              >
                or email me directly
              </p>
              <a
                href="mailto:jparafina@gmail.com"
                className="text-lg underline transition-colors hover:text-[#e2b714]"
                style={{ color: '#d1d0c5' }}
              >
                jparafina@gmail.com
              </a>
            </div>
            <div>
              <p
                className="text-xs tracking-[0.2em] uppercase mb-2"
                style={{ color: '#646669' }}
              >
                more about me
              </p>
              <a
                href="https://jayparafina.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg underline transition-colors hover:text-[#e2b714]"
                style={{ color: '#d1d0c5' }}
              >
                jayparafina.com
              </a>
            </div>
            <div>
              <p
                className="text-xs tracking-[0.2em] uppercase mb-3"
                style={{ color: '#646669' }}
              >
                stack
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: '#d1d0c5' }}
              >
                Next.js · Supabase · ReBAC · Anthropic API · Resend · Vercel
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer
        className="px-6 sm:px-10 py-10 text-center text-sm fade-in"
        style={{ color: '#646669', animationDelay: '480ms' }}
      >
        Built with care in El Sobrante, CA
      </footer>
    </main>
  );
}
