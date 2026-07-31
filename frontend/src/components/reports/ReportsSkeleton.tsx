'use client';

export function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Toolbar skeleton */}
      <div className="bg-white rounded-lg border border-[#090725]/10 px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="h-11 bg-gray-200 rounded-md w-28 animate-pulse" />
            <div className="h-11 bg-gray-200 rounded-md w-32 animate-pulse" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="h-11 bg-gray-200 rounded-md flex-1 sm:w-24 animate-pulse" />
            <div className="h-11 bg-gray-200 rounded-md flex-1 sm:w-28 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-[#090725]/10 p-4 animate-pulse"
          >
            <div className="space-y-3">
              <div className="h-8 w-8 bg-gray-200 rounded-lg" />
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-7 bg-gray-200 rounded w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Timeline / charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-[#090725]/10 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
            <div className="h-48 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
            <div className="h-48 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
