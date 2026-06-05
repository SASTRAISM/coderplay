export default function Stage3Loading() {
  return (
    <div className="h-full flex bg-gray-900 animate-pulse">
      {/* Left panel -- problem */}
      <div className="w-[38%] border-r border-gray-700 flex flex-col">
        <div className="border-b border-gray-700 px-4 py-3 flex gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-7 w-20 bg-gray-700 rounded-lg" />)}
        </div>
        <div className="flex-1 p-5 space-y-3">
          <div className="h-6 w-48 bg-gray-700 rounded-lg" />
          <div className="h-4 w-full bg-gray-700 rounded" />
          <div className="h-4 w-4/5 bg-gray-700 rounded" />
          <div className="h-4 w-3/5 bg-gray-700 rounded" />
          <div className="h-20 bg-gray-700 rounded-xl mt-4" />
          <div className="h-20 bg-gray-700 rounded-xl" />
        </div>
      </div>
      {/* Right panel -- editor */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="h-6 w-24 bg-gray-700 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-8 w-16 bg-gray-700 rounded-lg" />
            <div className="h-8 w-20 bg-gray-700 rounded-lg" />
          </div>
        </div>
        <div className="flex-1 bg-gray-950" />
        <div className="h-32 border-t border-gray-700 bg-gray-900" />
      </div>
    </div>
  )
}
