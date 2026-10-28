import { useState } from "react";

const ORDER_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "date", label: "Date" },
  { value: "viewCount", label: "Views" },
  { value: "rating", label: "Rating" },
];

export default function SearchBar({ onSearch, loading }) {
  const [q, setQ] = useState("");
  const [channelHandle, setChannelHandle] = useState("");
  const [order, setOrder] = useState("relevance");
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [minViews, setMinViews] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [open, setOpen] = useState(false);
  const activeFilters = [
    channelHandle,
    minViews,
    maxViews,
    after,
    before,
  ].filter(Boolean).length;

  function submit(e) {
    e.preventDefault();
    const query = q.trim();
    const channel = channelHandle.trim();
    if (!query && !channel) return;

    const params = { order, maxResults: 50 };
    if (query) params.q = query;
    if (channel) params.channelHandle = channel;
    if (after) params.publishedAfter = new Date(after).toISOString();
    if (before) params.publishedBefore = new Date(before).toISOString();
    if (minViews) params.minViews = parseInt(minViews);
    if (maxViews) params.maxViews = parseInt(maxViews);
    onSearch(params);
  }

  return (
    <form onSubmit={submit} className="search-panel">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search videos, channels, or topics"
          aria-label="Search YouTube videos"
          className="search-input"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="search-filter-button"
          title="Filters"
        >
          Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="search-submit"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {open && (
        <div className="search-filter-panel">
          <div className="search-filter-field">
            <label htmlFor="channel-handle">Channel</label>
            <input
              id="channel-handle"
              value={channelHandle}
              onChange={(e) => setChannelHandle(e.target.value)}
              placeholder="@channelname"
            />
          </div>
          <div className="search-filter-field">
            <label htmlFor="min-views">Minimum views</label>
            <input
              id="min-views"
              type="number"
              value={minViews}
              onChange={(e) => setMinViews(e.target.value)}
              placeholder="Any"
              min="0"
            />
          </div>
          <div className="search-filter-field">
            <label htmlFor="max-views">Maximum views</label>
            <input
              id="max-views"
              type="number"
              value={maxViews}
              onChange={(e) => setMaxViews(e.target.value)}
              placeholder="Any"
              min="0"
            />
          </div>
          <div>
            <label className="search-filter-label" htmlFor="search-order">
              Sort by
            </label>
            <select
              id="search-order"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="search-filter-control"
            >
              {ORDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="search-filter-field">
            <label htmlFor="published-after">After</label>
            <input
              id="published-after"
              type="date"
              value={after}
              onChange={(e) => setAfter(e.target.value)}
            />
          </div>

          <div className="search-filter-field">
            <label htmlFor="published-before">Before</label>
            <input
              id="published-before"
              type="date"
              value={before}
              onChange={(e) => setBefore(e.target.value)}
            />
          </div>
        </div>
      )}
    </form>
  );
}
