import { commerciallyActiveLabel } from "@/lib/opsChurchLabels";

export function CommercialBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        active
          ? "bg-emerald-50 text-emerald-800"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      {commerciallyActiveLabel(active)}
    </span>
  );
}
