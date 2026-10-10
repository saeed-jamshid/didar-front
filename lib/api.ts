/* ─────────────────────────────────────────────────────────────
   lib/api.ts
   Central API client.
   • Reads NEXT_PUBLIC_API_URL from env (falls back to localhost)
   • Handles paginated DRF responses automatically
   • Keeps API pagination/media on current origin for same-domain deployments
   ───────────────────────────────────────────────────────────── */

export interface Category {
  id: number;
  name: string;
  order: number;
  item_count: number;
  available_count: number;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  formatted_price: string;
  category: number;
  category_name: string;
  is_available: boolean;
  order: number;
  image: string | null;
  image_url: string | null;
  has_image: boolean;
  blur_data_url: string | null;
  is_time_available?: boolean;   // در ساعت سرویس هست یا نه
  available_from?: string;      // مثلاً "17:00"
  service_name?: string;
}

/* ── Paginated response shape from DRF ── */
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/* ── Resolve base URL ── */
const BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

// Django may use canonical Host behind preview proxy; browser keeps its own origin.
function apiUrl(url: string): string {
  if (BASE_URL || typeof window === "undefined") return url;
  const parsed = new URL(url, window.location.origin);
  return `${window.location.origin}${parsed.pathname}${parsed.search}`;
}

/* ── Generic paginated fetcher – follows `next` links until done ── */
async function fetchAllPages<T>(firstUrl: string): Promise<T[]> {
  const collected: T[] = [];
  let url: string | null = firstUrl;

  while (url) {
    const res: Response = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
    const data: PaginatedResponse<T> | T[] = await res.json();

    if (Array.isArray(data)) {
      collected.push(...data);
      url = null;
    } else {
      collected.push(...data.results);
      url = data.next ? apiUrl(data.next) : null;
    }
  }

  return collected;
}

/* ── Public API functions ── */

export async function fetchCategories(): Promise<Category[]> {
  return await fetchAllPages<Category>(`${BASE_URL}/api/categories/`);
}

export async function fetchItems(): Promise<MenuItem[]> {
  const items = await fetchAllPages<MenuItem>(`${BASE_URL}/api/items/`);
  return items.map((item) => ({
    ...item,
    image_url: item.image_url && apiUrl(item.image_url),
  }));
}
