import mongoose from 'mongoose';

/**
 * Connects to MongoDB Atlas.
 *
 * Deliberately non-fatal: browsing and search do not need a database, so a
 * missing or unreachable MongoDB should degrade the wishlist rather than take
 * the whole API down. The wishlist routes check the connection themselves and
 * return a clear 503 if it isn't ready.
 */
export async function connectDatabase(uri: string | undefined): Promise<boolean> {
  if (!uri) {
    console.warn('  MONGODB_URI is not set — wishlist endpoints will return 503.');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10_000,
    });
    console.log('  MongoDB connected');
    return true;
  } catch (error) {
    console.error('  MongoDB connection failed:', (error as Error).message);
    return false;
  }
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}
