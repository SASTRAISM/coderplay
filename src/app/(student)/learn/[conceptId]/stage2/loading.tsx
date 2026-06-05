export default function Stage2Loading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="h-4 w-32 bg-gray-200 rounded-lg" />
        <div className="h-7 w-48 bg-gray-200 rounded-xl" />
        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full" />
        {/* Question card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="h-4 w-24 bg-gray-200 rounded-full" />
          <div className="h-5 w-full bg-gray-200 rounded-lg" />
          <div className="h-5 w-4/5 bg-gray-200 rounded-lg" />
          <div className="space-y-3 mt-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  )
}
