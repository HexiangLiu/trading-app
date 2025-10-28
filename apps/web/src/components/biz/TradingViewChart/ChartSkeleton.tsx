import { memo } from 'react'

export const ChartSkeleton = memo(() => {
  return (
    <div className="w-full h-full bg-neutral-900">
      <div className="h-10 bg-neutral-700 border-b border-neutral-600 animate-pulse" />
      <div className="h-[calc(100%-2.5rem)] p-3">
        <div className="h-full w-full rounded-md bg-linear-to-b from-neutral-700 via-neutral-800 to-neutral-900 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="h-6 w-24 bg-neutral-600 rounded mb-2 mt-1 ml-1" />
            <div className="h-5 w-20 bg-neutral-600 rounded mb-2 ml-1" />
          </div>
          <div className="absolute inset-0 grid grid-cols-12 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="relative">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-neutral-600 rounded-t animate-pulse"
                  style={{ height: `${10 + (i % 10) * 7}%` }}
                />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-neutral-500/20 to-transparent animate-[shimmer_1.6s_infinite]" />
        </div>
      </div>
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
    </div>
  )
})
