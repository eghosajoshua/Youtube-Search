export default function VideoCard({ video }) {
  const date = new Date(video.publishedAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const views = Number(video.viewCount).toLocaleString();

  return (
    <div className="video-card overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
        className="block relative aspect-video bg-gray-100 overflow-hidden"
      >
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
            🎬
          </div>
        )}
      </a>

      {/* Info */}
      <div className="p-3.5 flex flex-col flex-1">
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-gray-900 hover:text-teal-700 line-clamp-2 leading-snug"
        >
          {video.title}
        </a>
        <p className="mt-1.5 text-xs text-gray-600 truncate">{video.channel}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <span>{date}</span>
          {video.viewCount > 0 && (
            <>
              <span>·</span>
              <span>{views} views</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
