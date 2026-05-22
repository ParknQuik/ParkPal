import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'parkpal_search_history';
const MAX_HISTORY = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
  };

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    const trimmed = query.trim().toLowerCase();
    setHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== trimmed);
      const updated = [query, ...filtered].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  const removeFromHistory = useCallback(async (query: string) => {
    const trimmed = query.trim().toLowerCase();
    const updated = history.filter(h => h.toLowerCase() !== trimmed);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setHistory(updated);
  }, [history]);

  return { history, addToHistory, clearHistory, removeFromHistory };
}
