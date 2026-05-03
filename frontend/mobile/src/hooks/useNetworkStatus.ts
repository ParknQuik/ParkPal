import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const check = async () => {
      try {
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        if (!cancelled) setIsConnected(response.ok);
      } catch {
        if (!cancelled) setIsConnected(false);
      }
      if (!cancelled) {
        timeout = setTimeout(check, 10000);
      }
    };
    check();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  return { isConnected };
}
