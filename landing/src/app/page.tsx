'use client';

import { useState } from 'react';
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { DemoSection } from "@/components/DemoSection";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { WaitlistModal } from "@/components/WaitlistModal";

export default function HomePage() {
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onOpenWaitlist={() => setIsWaitlistModalOpen(true)} />
      <main className="flex-1">
        <Hero onOpenWaitlist={() => setIsWaitlistModalOpen(true)} />
        <Features />
        <DemoSection />
        <CTA onOpenWaitlist={() => setIsWaitlistModalOpen(true)} />
      </main>
      <Footer onOpenWaitlist={() => setIsWaitlistModalOpen(true)} />
      <WaitlistModal
        isOpen={isWaitlistModalOpen}
        onClose={() => setIsWaitlistModalOpen(false)}
      />
    </div>
  );
}

