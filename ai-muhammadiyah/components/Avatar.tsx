export default function Avatar() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-950/40 sm:w-12 sm:h-12">
        AI
      </div>

      <div>
        <h2 className="font-bold text-lg">
          AI Muhammadiyah
        </h2>

        <p className="text-sm text-gray-400">
          Online
        </p>
      </div>
    </div>
  );
}
