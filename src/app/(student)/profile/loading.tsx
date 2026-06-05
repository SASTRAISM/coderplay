export default function ProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded-full" />
      <div className="h-7 w-36 bg-gray-200 rounded-xl" />
      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <div className="flex gap-5">
          <div className="w-20 h-20 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2 pt-2">
            <div className="h-5 w-32 bg-gray-200 rounded-lg" />
            <div className="h-4 w-44 bg-gray-200 rounded-lg" />
            <div className="h-3 w-24 bg-gray-200 rounded-lg" />
          </div>
        </div>
        <div className="h-20 bg-gray-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-48 bg-gray-200 rounded-2xl" />
    </div>
  )
}
