export default function CompleteLoading() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50 animate-pulse">
      {/* Hero */}
      <div className="bg-gray-900 px-6 py-14 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-700 mx-auto mb-4" />
        <div className="h-10 w-64 bg-gray-700 rounded-xl mx-auto mb-3" />
        <div className="h-5 w-40 bg-gray-600 rounded-lg mx-auto mb-2" />
        <div className="h-4 w-52 bg-gray-700 rounded mx-auto mb-8" />
        <div className="inline-flex gap-8 bg-white/5 border border-white/10 rounded-2xl px-8 py-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-8 w-16 bg-gray-700 rounded-lg mx-auto mb-2" />
              <div className="h-3 w-12 bg-gray-600 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
      {/* Cards */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-3 bg-gray-50">
              <div className="w-9 h-9 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-48 bg-gray-200 rounded-lg" />
                <div className="h-3 w-32 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-100 rounded" style={{ width: `${90 - j * 10}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
