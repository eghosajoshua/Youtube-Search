import { useState } from "react";
import useAuth from "./hooks/useAuth";
import LoginPage from "./components/LoginPage";
import SearchBar from "./components/SearchBar";
import ResultsGrid from "./components/ResultsGrid";
import SettingsPage from "./components/SettingsPage";

const TABS = [
  { id: "search", label: "Search" },
  { id: "settings", label: "Settings" },
];

export default function App() {
  const { authed, loading, user, login, logout } = useAuth();
  const [tab, setTab] = useState("search");

  if (loading)
    return (
      <div className="min-h-screen app-canvas flex items-center justify-center">
        <div
          className="w-8 h-8 border-2 border-teal-600 border-t-transparent
                      rounded-full animate-spin"
        />
      </div>
    );

  if (!authed) return <LoginPage onLogin={login} />;

  return (
    <div className="min-h-screen app-canvas text-gray-900">
      <header className="app-header sticky top-0 z-40">
        <div className="app-header-inner max-w-7xl mx-auto px-4 flex items-center gap-5">
          <span className="font-bold text-base text-gray-900 tracking-tight shrink-0">
            YouTube Search
          </span>
          <nav className="flex gap-1 flex-1" aria-label="Main navigation">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    tab === t.id
                      ? "bg-teal-700 text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
            <span className="hidden sm:inline">Signed in</span>
            <span className="font-medium text-gray-900">
              {user?.username ?? "Unknown"}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-xs px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 sm:py-6">
        {tab === "search" && <SearchPage />}
        {tab === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

function SearchPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nextPage, setNextPage] = useState(null);
  const [total, setTotal] = useState(0);
  const [lastQuery, setLastQuery] = useState(null);
  const [error, setError] = useState(null);

  async function handleSearch(params, append = false) {
    setLoading(true);
    setError(null);
    try {
      // Use params from SearchBar; default to 50 if not specified
      const searchParams = { ...params };
      if (!searchParams.maxResults) searchParams.maxResults = 50;
      const qs = new URLSearchParams(searchParams);
      if (append && nextPage) qs.set("pageToken", nextPage);
      const res = await fetch(`/api/search.php?${qs}`);
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        const lower = text.toLowerCase();
        if (
          lower.includes("no api key") ||
          lower.includes("no api keys") ||
          lower.includes("no keys")
        ) {
          return setError("No API keys configured. Add keys in Settings.");
        }
        return setError("Server error. Please try again later.");
      }
      const json = await res.json();
      if (!json || !json.success)
        return setError((json && json.error) || "Unknown error");
      setVideos((v) =>
        append ? [...v, ...json.data.videos] : json.data.videos,
      );
      setNextPage(json.data.nextPageToken);
      setTotal(json.data.totalResults);
      if (!append) setLastQuery(params);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SearchBar onSearch={(p) => handleSearch(p)} loading={loading} />

      {error && (
        <div
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg
                        text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      {videos.length > 0 && (
        <>
          <p className="mt-4 mb-2 text-sm text-gray-600">
            Showing{" "}
            <span className="text-gray-900 font-semibold">{videos.length}</span>{" "}
            of{" "}
            <span className="text-gray-900 font-semibold">
              {Number(total).toLocaleString()}
            </span>{" "}
            results
          </p>
          <ResultsGrid videos={videos} />
          {nextPage && (
            <div className="mt-8 text-center">
              <button
                onClick={() => handleSearch(lastQuery, true)}
                disabled={loading}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-md
                           text-sm font-medium text-gray-800 disabled:opacity-50"
              >
                {loading ? "Loadingâ€¦" : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
