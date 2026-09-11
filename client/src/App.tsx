import { Link, NavLink, Route, Routes } from 'react-router-dom';

import { StateMessage } from './components/StateMessage';
import { useWishlist } from './hooks/useWishlist';
import { BrowsePage } from './pages/BrowsePage';
import { MovieDetailPage } from './pages/MovieDetailPage';
import { WishlistPage } from './pages/WishlistPage';

function navClass({ isActive }: { isActive: boolean }) {
  return `text-sm transition ${isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'}`;
}

function WishlistNavLink() {
  const { data } = useWishlist();
  const count = data?.length ?? 0;

  return (
    <NavLink to="/wishlist" className={navClass}>
      Wishlist
      {count > 0 && (
        <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-neutral-950">
          {count}
        </span>
      )}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-20 border-b border-neutral-800 bg-[#0a0a0b]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="text-sm font-semibold tracking-tight text-white">
            Movie<span className="text-amber-500">Discovery</span>
          </Link>

          <div className="ml-auto flex items-center gap-5">
            <NavLink to="/" end className={navClass}>
              Browse
            </NavLink>
            <WishlistNavLink />
          </div>
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/movie/:id" element={<MovieDetailPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route
            path="*"
            element={
              <div className="mx-auto max-w-3xl px-4 py-16">
                <StateMessage
                  title="Page not found"
                  description="That page doesn't exist. Head back to browsing."
                />
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
