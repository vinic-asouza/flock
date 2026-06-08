'use client';

interface GuideStepListProps {
  steps: string[];
}

export function GuideStepList({ steps }: GuideStepListProps) {
  return (
    <ol className="list-decimal list-inside space-y-3 text-gray-700 text-sm leading-relaxed">
      {steps.map((step, index) => (
        <li key={index} className="pl-1">
          {step}
        </li>
      ))}
    </ol>
  );
}
