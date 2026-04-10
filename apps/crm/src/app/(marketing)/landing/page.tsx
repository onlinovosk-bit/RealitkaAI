import { Syne, Instrument_Sans } from 'next/font/google';
import Hero from './sections/Hero';
import ProblemSection from './sections/ProblemSection';
import Pipeline from './sections/Pipeline';
import GoalsSlider from './sections/GoalsSlider';
import AiLoading from './sections/AiLoading';
import PreviewSection from './sections/PreviewSection';
import FinalCTA from './sections/FinalCTA';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['700', '800'],
});
const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
});

export const metadata = {
  title: 'Revolis.AI – Uzatváraj viac obchodov. Bez chaosu.',
  description:
    'AI Chief of Sales pre realitky. Prioritizuje leady, nájde nehnuteľnosti, navrhne ďalší krok. Prvých 30 dní zadarmo.',
};

export default function LandingPage() {
  return (
    <main
      className={`${syne.variable} ${instrument.variable} bg-slate-950 text-slate-50 min-h-screen`}
      style={{ fontFamily: 'var(--font-instrument)', WebkitFontSmoothing: 'antialiased' }}
    >
      <Hero />
      <ProblemSection />
      <Pipeline />
      <GoalsSlider />
      <AiLoading />
      <PreviewSection />
      <FinalCTA />
    </main>
  );
}
