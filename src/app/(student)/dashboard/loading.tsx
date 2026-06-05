export default function DashboardLoading() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50 animate-pulse">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-40 bg-gray-200 rounded-lg" />
            <div className="h-7 w-56 bg-gray-200 rounded-xl" />
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-200" />
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
        </div>
        {/* Course cards */}
        <div className="h-5 w-32 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    </div>
  )
}
