import type { MovieSummary } from '../types';
import { MovieCard } from './MovieCard';

/**
 * 2 columns on a phone up to 6 on a wide desktop. Poster tiles have a fixed
 * aspect ratio, so the grid reflows without any row ever collapsing.
 */
export function MovieGrid({ movies }: { movies: MovieSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
