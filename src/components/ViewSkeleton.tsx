import React from 'react';

export const ViewSkeleton: React.FC<{ title?: string }> = ({ title }) => {
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Skeleton Header */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-[#27272A] rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-[#1C1C1E] rounded-lg animate-pulse" />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-10 w-28 bg-[#27272A] rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Skeleton Search & Controls Bar */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="h-10 flex-1 bg-[#1C1C1E] rounded-xl animate-pulse" />
        <div className="h-10 w-36 bg-[#1C1C1E] rounded-xl animate-pulse" />
        <div className="h-10 w-28 bg-[#1C1C1E] rounded-xl animate-pulse" />
      </div>

      {/* Skeleton Grid / List Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div key={idx} className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#27272A] rounded-xl animate-pulse shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-3/4 bg-[#27272A] rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-[#1C1C1E] rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-[#27272A]/50">
              <div className="h-3 w-full bg-[#1C1C1E] rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-[#1C1C1E] rounded animate-pulse" />
            </div>
            <div className="flex justify-between items-center pt-2">
              <div className="h-5 w-20 bg-[#27272A] rounded-full animate-pulse" />
              <div className="h-8 w-24 bg-[#D4AF37]/10 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
