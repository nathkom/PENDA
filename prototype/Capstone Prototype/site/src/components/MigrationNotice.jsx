import { X, ExternalLink, Megaphone } from "lucide-react";

const NEW_SITE_URL = "https://nathkom.github.io/commongrounds/";

export default function MigrationNotice({ open, onClose }) {
  if (!open) return null;

  const dismiss = onClose;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-notice-title"
      onClick={dismiss}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss notice"
          className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
          <Megaphone size={24} className="text-green-700" />
        </div>

        <h2
          id="migration-notice-title"
          className="text-xl font-bold text-gray-900 mb-2"
        >
          We've moved!
        </h2>

        <p className="text-gray-600 text-sm leading-relaxed mb-1">
          This site is part of a student capstone project that is ending soon,
          and <span className="font-semibold text-gray-800">it will be shut down shortly.</span>
        </p>
        <p className="text-gray-600 text-sm leading-relaxed mb-5">
          We've migrated to a new home. Please visit us there to keep exploring
          community spaces and events.
        </p>

        <a
          href={NEW_SITE_URL}
          className="flex items-center justify-center gap-2 w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
        >
          Go to the new site
          <ExternalLink size={18} />
        </a>

        <button
          onClick={dismiss}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-3 py-1 transition-colors"
        >
          Continue to the old site for now
        </button>
      </div>
    </div>
  );
}
