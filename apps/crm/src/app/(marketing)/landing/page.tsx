import localFont from 'next/font/local';
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

// Self-hosted so the build does not depend on reaching Google Fonts. next/font/google
// fetches the CSS at build time and then does `/\.(woff|woff2|eot|ttf|otf)$/.exec(url)[1]`
// on every src it finds; when Google answers with a url that regex does not match, that
// `[1]` reads from null and the build dies on a page the diff never touched. It happened
// on 2026-09-22 for about an hour, red on GitHub Actions while the same commit built fine
// on Vercel. Nothing in the app can prevent that — the only fix is to stop fetching.
//
// The file is Inter's variable font pinned to opsz 14 (what Google served) and subset to
// latin + latin-ext. latin-ext is not optional here: it carries ľ š č ť ž ň ď ŕ ĺ, so a
// latin-only subset would drop Slovak diacritics to a fallback font.
const inter = localFont({
  src: './fonts/Inter-Variable-latin-ext.woff2',
  variable: '--font-inter',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
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
