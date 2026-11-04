import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { ProblemSolution } from '@/components/ProblemSolution';
import { AudienceSection } from '@/components/AudienceSection';
import { Features } from '@/components/Features';
import { ReportsHighlight } from '@/components/ReportsHighlight';
import { DemoSection } from '@/components/DemoSection';
import { DemoCta } from '@/components/DemoCta';
import { ProcessSection } from '@/components/ProcessSection';
import { Pricing } from '@/components/Pricing';
import { FaqSection } from '@/components/FaqSection';
import { CTA } from '@/components/CTA';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip">
      <Header overlay />
      <main className="flex-1">
        <Hero />
        <ProblemSolution />
        <AudienceSection />
        <Features />
        <ReportsHighlight />
        <DemoSection />
        <DemoCta />
        <ProcessSection />
        <Pricing />
        <FaqSection />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
