'use client';

import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { DemoSection } from "@/components/DemoSection";
import { ProcessSection } from "@/components/ProcessSection";
import { Pricing } from "@/components/Pricing";
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
    <div className="min-h-screen flex flex-col">
      <Header onOpenWaitlist={scrollToWaitlist} />
      <main className="flex-1">
        <Hero onOpenWaitlist={scrollToWaitlist} />
        <Features />
        <DemoSection />
        <ProcessSection />
        <Pricing />
        <CTA />
      </main>
      <Footer onOpenWaitlist={scrollToWaitlist} />
    </div>
  );
}

