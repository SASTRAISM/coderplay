export default function AchievementsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded-full" />
      <div className="h-7 w-44 bg-gray-200 rounded-xl" />
      <div className="h-36 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-9 w-24 bg-gray-200 rounded-full" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="h-36 bg-gray-200 rounded-2xl" />)}
      </div>
    </div>
  )
}
