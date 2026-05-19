export type SearchHistoryEntry = {
  id: string;
  agency: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  resultCount: number;
  searchedAt: string; // ISO
};

const KEY = "dl.history";

export function getHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SearchHistoryEntry[];
  } catch {
    return [];
  }
}

export function addHistory(entry: Omit<SearchHistoryEntry, "id" | "searchedAt">) {
  if (typeof window === "undefined") return;
  const list = getHistory();
  const next: SearchHistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    searchedAt: new Date().toISOString(),
  };
  list.unshift(next);
  window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
