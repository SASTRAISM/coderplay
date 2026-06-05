export default function CertificateLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 animate-pulse">
      {/* Controls */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <div className="h-5 w-28 bg-gray-700 rounded-lg" />
        <div className="h-9 w-36 bg-gray-700 rounded-full" />
      </div>
      {/* Certificate card */}
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-3xl overflow-hidden" style={{ border: '3px solid #4B4B3A' }}>
        <div className="m-4 rounded-2xl border border-gray-700 p-8 sm:p-12 space-y-8">
          {/* Header */}
          <div className="flex justify-center">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-700" />
              <div className="space-y-2">
                <div className="h-6 w-32 bg-gray-700 rounded-lg" />
                <div className="h-3 w-56 bg-gray-600 rounded" />
              </div>
            </div>
          </div>
          <div className="h-px bg-gray-700" />
          {/* Title */}
          <div className="text-center space-y-3">
            <div className="h-3 w-40 bg-gray-700 rounded mx-auto" />
            <div className="h-10 w-64 bg-gray-600 rounded-xl mx-auto" />
          </div>
          {/* Name */}
          <div className="text-center space-y-2">
            <div className="h-3 w-12 bg-gray-700 rounded mx-auto" />
            <div className="h-10 w-72 bg-gray-600 rounded-xl mx-auto" />
            <div className="h-3 w-36 bg-gray-700 rounded mx-auto" />
          </div>
          {/* Course */}
          <div className="flex justify-center">
            <div className="h-20 w-80 bg-gray-700 rounded-2xl" />
          </div>
          <div className="h-px bg-gray-700" />
          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-700 rounded" />
              <div className="h-4 w-32 bg-gray-600 rounded-lg" />
            </div>
            <div className="w-20 h-20 rounded-full bg-gray-700" />
            <div className="space-y-2 text-right">
              <div className="h-6 w-28 bg-gray-700 rounded-lg" />
              <div className="h-3 w-24 bg-gray-600 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
