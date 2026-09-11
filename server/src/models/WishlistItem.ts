import { model, Schema } from 'mongoose';

/**
 * A saved movie, scoped to one anonymous device.
 *
 * Two decisions worth defending in review:
 *
 * 1. WHY A SNAPSHOT, NOT JUST AN ID.
 *    Storing only { deviceId, movieId } would mean the wishlist page has to call
 *    TMDB once per saved movie to render a poster and title — 30 saved films
 *    becomes 30 upstream requests on every visit. Storing the handful of fields
 *    the wishlist card actually displays makes that page a single database read
 *    with zero upstream calls. The trade-off is that a title or poster can drift
 *    out of date; for a wishlist card that is an acceptable staleness, and it is
 *    noted as a known limitation in the README.
 *
 * 2. WHY A COMPOUND UNIQUE INDEX.
 *    Double-clicking the save button fires two POSTs. Enforcing uniqueness on
 *    (deviceId, movieId) at the database level means the second one cannot
 *    create a duplicate row, regardless of what the application code does.
 *    Correctness belongs in the schema, not only in the handler.
 */
const wishlistItemSchema = new Schema(
  {
    deviceId: { type: String, required: true, index: true },
    movieId: { type: Number, required: true },

    // Snapshot of what the wishlist card renders.
    title: { type: String, required: true },
    posterUrl: { type: String, default: null },
    year: { type: Number, default: null },
    rating: { type: Number, default: null },

    addedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

wishlistItemSchema.index({ deviceId: 1, movieId: 1 }, { unique: true });

export const WishlistItem = model('WishlistItem', wishlistItemSchema);
