import { Inter } from 'next/font/google';
import Hero from './sections/Hero';
import TickerBanner from './sections/TickerBanner';
import ProblemSection from './sections/ProblemSection';
import HowItWorks from './sections/HowItWorks';
import BenefitsSection from './sections/BenefitsSection';
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
import L99ComparisonSection from './sections/L99ComparisonSection';
import ObjectionFaq from './sections/ObjectionFaq';
import ProofNumbers from './sections/ProofNumbers';
import { CtaAbProvider } from '@/components/landing/CtaAbProvider';
import { CTASection } from '@/components/landing/CTASection';
import { FearReductionSection } from '@/components/landing/FearReductionSection';
import FounderSpotsLandingStrip from '@/components/landing/FounderSpotsLandingStrip';
import { HeroSection } from '@/components/landing/HeroSection';
import { ValueSection } from '@/components/landing/ValueSection';
import { FounderDiscountSpotsProvider } from '@/components/shared/founder-discount-spots-context';
import LegalFooter from '@/components/marketing/LegalFooter';
import RoiGuaranteeSection from '@/components/marketing/RoiGuaranteeSection';
import { SLATE_HORIZON } from '@/lib/slate-horizon-theme';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'Revolis.AI – Uzatváraj viac obchodov. Bez chaosu.',
  description:
    'AI obchodný pomocník pre realitky. Prioritizuje príležitosti, nájde nehnuteľnosti a navrhne ďalší krok. 100 % garancia vrátenia poplatku prvých 30 dní.',
};

export default function LandingPage() {
  return (
    <main
      className={`${inter.variable} min-h-screen overflow-x-hidden`}
      style={{
        fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        background: `linear-gradient(180deg, ${SLATE_HORIZON.bg} 0%, #FFFFFF 40%)`,
        color: SLATE_HORIZON.ink,
      }}
    >
      <Hero />
      <TickerBanner />

      <FounderDiscountSpotsProvider>
        <FounderSpotsLandingStrip />
        <RoiCalculatorHero />

        <ProblemSection />
        <L99ComparisonSection />

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

        <ResponseBenchmark />
        <HowItWorks />
        <BenefitsSection />
        <Metrics />
        <Pipeline />
        <MiniPlaybookDemo />
        <IntegrationsTrustStrip />
        <GoalsSlider />
        <AiLoading />
        <PreviewSection />
        <Testimonials />
        <ProofNumbers />
        <ObjectionFaq />

        <div className="mx-auto max-w-4xl px-4">
          <RoiGuaranteeSection />
        </div>

        <FinalCTA />
      </FounderDiscountSpotsProvider>

      <LegalFooter />
    </main>
  );
}
