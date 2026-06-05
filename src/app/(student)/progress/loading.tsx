export default function ProgressLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded-full" />
      <div className="h-7 w-40 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
        ))}
      </div>
      <div className="h-40 bg-gray-200 rounded-2xl" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
