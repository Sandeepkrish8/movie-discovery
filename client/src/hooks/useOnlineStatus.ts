import { useEffect, useState } from 'react';

/**
 * Tracks browser connectivity.
 *
 * `navigator.onLine` is not a guarantee of reachability — it only reports
 * whether the device has a network interface up — but a false value is
 * reliable. That is enough to distinguish "you have no connection" from "the
 * server returned an error", which are two different messages for the user and
 * two different next actions.
 *
 * React Query's refetchOnReconnect handles the recovery automatically, so the
 * data reappears when the connection does without the user doing anything.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
