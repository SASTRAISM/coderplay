export default function ConceptLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded-lg" />
      <div className="space-y-1">
        <div className="h-7 w-64 bg-gray-200 rounded-xl" />
        <div className="h-4 w-48 bg-gray-200 rounded-lg" />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-36 bg-gray-200 rounded-2xl" />
        ))}
      </div>
      <div className="h-12 bg-gray-200 rounded-xl" />
    </div>
  )
}
