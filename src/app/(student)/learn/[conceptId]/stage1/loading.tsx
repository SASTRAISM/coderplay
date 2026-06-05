export default function Stage1Loading() {
  return (
    <div className="h-full flex flex-col bg-white animate-pulse">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 bg-gray-200 rounded" />
          <div className="h-4 w-40 bg-gray-200 rounded-lg" />
        </div>
        <div className="h-8 w-28 bg-gray-200 rounded-full" />
      </div>
      {/* Chat area */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {/* AI bubble */}
        <div className="flex gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-4 w-3/4 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-4/5" />
            <div className="h-3 bg-gray-200 rounded w-3/5" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </div>
      {/* Input */}
      <div className="border-t border-gray-100 p-4 shrink-0">
        <div className="h-12 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  )
}
