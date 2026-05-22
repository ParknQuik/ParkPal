import { useState, useEffect } from 'react';
import { useSearchHistory } from './useSearchHistory';

export function useAutocomplete(query: string, listings: any[]) {
  const { history } = useSearchHistory();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const trimmed = query.toLowerCase().trim();

    const sources = new Set<string>();

    history.forEach(h => {
      if (h.toLowerCase().includes(trimmed)) sources.add(h);
    });

    listings.forEach((l: any) => {
      if (l.title?.toLowerCase().includes(trimmed)) sources.add(l.title);
      if (l.address?.toLowerCase().includes(trimmed)) sources.add(l.address);
    });

    setSuggestions(Array.from(sources).slice(0, 5));
  }, [query, history, listings]);

  return suggestions;
}
