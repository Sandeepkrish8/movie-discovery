import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { StateMessage } from '../components/StateMessage';
import { WishlistButton } from '../components/WishlistButton';
import { useMovieDetail } from '../hooks/useMovies';
import { toApiError } from '../lib/api';

function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

const LANGUAGE_NAMES = new Intl.DisplayNames(['en'], { type: 'language' });

function formatLanguage(code: string | null): string | null {
  if (!code) return null;
  try {
    return LANGUAGE_NAMES.of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** One row of the facts panel. Renders nothing when the value is missing. */
function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="border-t border-neutral-800 py-3 first:border-t-0 sm:border-t-0 sm:py-0">
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-1 text-sm text-neutral-200">{value}</dd>
    </div>
  );
}

export function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const movieId = Number(id);
  const { data: movie, isLoading, isError, error, refetch } = useMovieDetail(movieId);

  /**
   * MovieCard passes the browse URL it was clicked from. Preferring that over
   * history.back() means the back button still works if the user landed here
   * from a shared link.
   */
  const backTo = (location.state as { from?: string } | null)?.from;

  function goBack() {
    if (backTo) navigate(backTo);
    else navigate('/');
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse px-4 py-10 sm:px-6">
        <div className="h-4 w-28 rounded bg-neutral-800" />
        <div className="mt-8 flex flex-col gap-8 sm:flex-row">
          <div className="aspect-[2/3] w-40 shrink-0 rounded-xl bg-neutral-800 sm:w-56" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-2/3 rounded bg-neutral-800" />
            <div className="h-4 w-1/3 rounded bg-neutral-800" />
            <div className="h-6 w-1/2 rounded bg-neutral-800" />
            <div className="space-y-2 pt-4">
              <div className="h-3.5 w-full rounded bg-neutral-800" />
              <div className="h-3.5 w-11/12 rounded bg-neutral-800" />
              <div className="h-3.5 w-3/4 rounded bg-neutral-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !movie) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <button
          onClick={goBack}
          className="mb-8 text-sm text-neutral-400 transition hover:text-white"
        >
          ← Back to results
        </button>
        <StateMessage
          icon="!"
          title="Couldn't load this movie"
          description={error ? toApiError(error).message : 'The movie could not be found.'}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const runtime = formatRuntime(movie.runtime);
  const releaseDate = formatDate(movie.releaseDate);
  const language = formatLanguage(movie.originalLanguage);

  return (
    <article className="relative">
      {/*
        Backdrop as a background layer rather than a sibling block.
        Content sits on top with its own padding, so there is no negative margin
        to break at odd viewport sizes, and the stacked overlays guarantee text
        contrast regardless of how bright the still is.
      */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden">
        {movie.backdropUrl && (
          <img
            src={movie.backdropUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full scale-105 object-cover object-top opacity-30 blur-[1px]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b]/70 via-[#0a0a0b]/85 to-[#0a0a0b]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-sm text-neutral-300 transition hover:bg-neutral-800/60 hover:text-white"
        >
          ← Back to results
        </button>

        <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:gap-10">
          <div className="w-40 shrink-0 sm:w-56">
            <div className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-neutral-800 shadow-2xl ring-1 ring-white/10">
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-3 text-center text-xs text-neutral-500">
                  No poster available
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
              {movie.title}
            </h1>

            {movie.tagline && (
              <p className="mt-2 text-base italic text-neutral-400">{movie.tagline}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-neutral-300 sm:justify-start">
              <span className="rounded-md bg-amber-500/15 px-2.5 py-1 font-semibold tabular-nums text-amber-400 ring-1 ring-amber-500/25">
                {movie.rating !== null ? `★ ${movie.rating.toFixed(1)}` : 'Not rated'}
              </span>
              {movie.voteCount > 0 && (
                <span className="text-neutral-400">
                  {movie.voteCount.toLocaleString()} votes
                </span>
              )}
              {movie.year && <span className="text-neutral-500">•</span>}
              {movie.year && <span>{movie.year}</span>}
              {runtime && <span className="text-neutral-500">•</span>}
              {runtime && <span>{runtime}</span>}
            </div>

            {movie.genres.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                {movie.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-full border border-neutral-700 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-300"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-center sm:justify-start">
              <WishlistButton movie={movie} variant="full" />
            </div>

            <div className="mt-7 text-left">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Overview
              </h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-neutral-300">
                {movie.overview || 'No overview has been written for this film yet.'}
              </p>
            </div>

            {movie.homepage && (
              <a
                href={movie.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3.5 py-2 text-sm text-neutral-200 transition hover:border-neutral-500 hover:text-white"
              >
                Official site ↗
              </a>
            )}
          </div>
        </div>

        {/*
          A facts panel below the fold. Without it the page ends in dead space on
          a wide screen, and each Fact renders nothing when TMDB has no value —
          so an incomplete record collapses gracefully instead of showing
          "Runtime: null".
        */}
        <section className="mt-14 rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Details
          </h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2 sm:gap-y-6 lg:grid-cols-4">
            <Fact label="Release date" value={releaseDate} />
            <Fact label="Runtime" value={runtime} />
            <Fact label="Original language" value={language} />
            <Fact
              label="Rating"
              value={movie.rating !== null ? `${movie.rating.toFixed(1)} / 10` : 'Not rated yet'}
            />
          </dl>
        </section>
      </div>
    </article>
  );
}
