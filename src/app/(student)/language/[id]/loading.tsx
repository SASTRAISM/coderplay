export default function LanguageLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50 animate-pulse">
      {/* Sticky header skeleton */}
      <div className="bg-white border-b border-gray-100 shrink-0 px-4 sm:px-6 py-4 space-y-4">
        <div className="h-4 w-28 bg-gray-200 rounded-lg" />
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-200" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-36 bg-gray-200 rounded-lg" />
            <div className="h-3 w-48 bg-gray-200 rounded-lg" />
          </div>
          <div className="h-2 w-32 bg-gray-200 rounded-full" />
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-4">
          <div className="h-20 bg-gray-200 rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
          </div>
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-9 w-20 bg-gray-200 rounded-full" />)}
          </div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-2xl" />)}
          </div>
        </div>
      </div>
    </div>
  )
}
