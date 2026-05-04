import { useState, useEffect, useRef } from 'react';

const CHECK_URL = 'https://www.google.com/generate_204';
const CHECK_INTERVAL = 15000; // 15 seconds
const CHECK_TIMEOUT = 8000; // 8 seconds

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT);
        const response = await fetch(CHECK_URL, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'manual',
        });
        clearTimeout(timeoutId);
        // generate_204 returns 204 on success; any status < 400 means connected
        if (!cancelled) setIsConnected(response.status < 400);
      } catch {
        // Network error = definitely offline
        if (!cancelled) setIsConnected(false);
      }
      if (!cancelled) {
        intervalRef.current = setTimeout(check, CHECK_INTERVAL);
      }
    };

    check();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, []);

  return { isConnected };
}
