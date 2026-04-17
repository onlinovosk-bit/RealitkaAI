import { Syne, Instrument_Sans } from 'next/font/google';
import Hero from './sections/Hero';
import ProblemSection from './sections/ProblemSection';
import HowItWorks from './sections/HowItWorks';
import Metrics from './sections/Metrics';
import Pipeline from './sections/Pipeline';
import GoalsSlider from './sections/GoalsSlider';
import AiLoading from './sections/AiLoading';
import PreviewSection from './sections/PreviewSection';
import Testimonials from './sections/Testimonials';
import FinalCTA from './sections/FinalCTA';
import RoiCalculatorHero from './sections/RoiCalculatorHero';
import ResponseBenchmark from './sections/ResponseBenchmark';
import MiniPlaybookDemo from './sections/MiniPlaybookDemo';
import IntegrationsTrustStrip from './sections/IntegrationsTrustStrip';
import ObjectionFaq from './sections/ObjectionFaq';
import ProofNumbers from './sections/ProofNumbers';
import BlogPromoTicker from '@/components/marketing/BlogPromoTicker';
import { CtaAbProvider } from '@/components/landing/CtaAbProvider';
import { CTASection } from '@/components/landing/CTASection';
import { FearReductionSection } from '@/components/landing/FearReductionSection';
import { HeroSection } from '@/components/landing/HeroSection';
import { ValueSection } from '@/components/landing/ValueSection';

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
    'AI obchodný pomocník pre realitky. Prioritizuje príležitosti, nájde nehnuteľnosti a navrhne ďalší krok. 100 % garancia vrátenia poplatku prvých 30 dní.',
};

export default function LandingPage() {
  return (
    <main
      className={`${syne.variable} ${instrument.variable} bg-slate-950 text-slate-50 min-h-screen`}
      style={{ fontFamily: 'var(--font-instrument)', WebkitFontSmoothing: 'antialiased' }}
    >
      {/* 1. Hero – prvý dojem, živý produkt */}
      <Hero />

      {/* 1.1 ROI kalkulačka v hero */}
      <RoiCalculatorHero />

      {/* 2. Problem – emócia, identifikácia problému */}
      <ProblemSection />

      {/* 2.0 AI Asistent — messaging (Hero + value + trust + CTA) */}
      <CtaAbProvider>
        <section
          id="ai-asistent"
          className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-6"
          aria-label="AI Asistent"
        >
          <HeroSection />
          <ValueSection />
          <FearReductionSection />
          <CTASection />
        </section>
      </CtaAbProvider>

      {/* 2.1 Response benchmark */}
      <ResponseBenchmark />

      {/* 3. HowItWorks – 3 kroky, riešenie */}
      <HowItWorks />

      {/* 4. Metrics – dôveryhodnosť číslami */}
      <Metrics />

      {/* 5. Pipeline – AI power moment */}
      <Pipeline />

      {/* 5.1 Mini playbook demo */}
      <MiniPlaybookDemo />

      {/* 5.2 Integrations trust strip */}
      <IntegrationsTrustStrip />

      {/* 6. GoalsSlider – personalizácia, zapojenie */}
      <GoalsSlider />

      {/* 7. AiLoading – AI feel, premium zážitok */}
      <AiLoading />

      {/* 8. PreviewSection – vidíš produkt */}
      <PreviewSection />

      {/* 9. Testimonials – sociálny dôkaz */}
      <Testimonials />

      {/* 9.1 Proof numbers */}
      <ProofNumbers />

      {/* 9.2 FAQ námietky */}
      <ObjectionFaq />

      {/* 10. FinalCTA – posledný úder */}
      <FinalCTA />

      {/* Rotujúci blog pás (odkazy prečo Revolis.AI) */}
      <BlogPromoTicker />
    </main>
  );
}
