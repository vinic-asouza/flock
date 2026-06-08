'use client';

interface GuideDetailsAccordionProps {
  details: string[];
}

export function GuideDetailsAccordion({ details }: GuideDetailsAccordionProps) {
  if (details.length === 0) return null;

  return (
    <details className="group bg-gray-50 border border-gray-200 rounded-lg">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-900 list-none flex items-center justify-between">
        <span>Detalhes</span>
        <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <ul className="px-4 pb-4 space-y-2 text-sm text-gray-600 list-disc list-inside">
        {details.map((detail, index) => (
          <li key={index}>{detail}</li>
        ))}
      </ul>
    </details>
  );
}
