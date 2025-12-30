import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-6xl font-bold mb-6">
          <span className="text-gradient">Unwrapped for Plex</span>
        </h1>
        <p className="text-2xl text-gray-300 mb-4">
          Your Year in Review
        </p>
        <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
          Discover your personalized Plex statistics for 2025. See your top movies, shows,
          viewing patterns, and fun achievements!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center px-8 py-4 bg-plex-500 hover:bg-plex-600 text-white font-semibold rounded-lg transition-colors"
          >
            Admin Login
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="glass p-6 rounded-lg">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Detailed Stats</h3>
            <p className="text-gray-400">
              Comprehensive viewing statistics with top content and patterns
            </p>
          </div>

          <div className="glass p-6 rounded-lg">
            <div className="text-4xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold mb-2">Top Content</h3>
            <p className="text-gray-400">
              See your most watched movies, shows, and favorite genres
            </p>
          </div>

          <div className="glass p-6 rounded-lg">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold mb-2">Achievements</h3>
            <p className="text-gray-400">
              Unlock fun badges and discover interesting viewing facts
            </p>
          </div>
        </div>

        <div className="mt-16 text-gray-500 text-sm">
          <p>Powered by Tautulli and Overseerr</p>
        </div>
      </div>
    </div>
  );
}
