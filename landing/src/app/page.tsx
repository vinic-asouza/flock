'use client';

import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { AudienceSection } from "@/components/AudienceSection";
import { OverviewSection } from "@/components/OverviewSection";
import { Features } from "@/components/Features";
import { ReportsHighlight } from "@/components/ReportsHighlight";
import { DemoSection } from "@/components/DemoSection";
import { ProcessSection } from "@/components/ProcessSection";
import { Pricing } from "@/components/Pricing";
import { FaqSection } from "@/components/FaqSection";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  const scrollToWaitlist = () => {
    const waitlistSection = document.getElementById('waitlist');
    if (waitlistSection) {
      waitlistSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col min-w-0 overflow-x-hidden">
      <Header onOpenWaitlist={scrollToWaitlist} />
      <main className="flex-1">
        <Hero />
        <AudienceSection />
        <OverviewSection />
        <Features />
        <ReportsHighlight />
        <DemoSection />
        <ProcessSection />
        <Pricing />
        <FaqSection />
        <CTA />
      </main>
      <Footer onOpenWaitlist={scrollToWaitlist} />
    </div>
  );
}
