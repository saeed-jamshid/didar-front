/* ─────────────────────────────────────────────────────────────
   lib/api.ts
   Central API client.
   • Reads NEXT_PUBLIC_API_URL from env (falls back to localhost)
   • Handles paginated DRF responses automatically
   • Falls back to MOCK_DATA when backend is unreachable
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
      url = data.next ?? null;
    }
  }

  return collected;
}

/* ── Public API functions ── */

export async function fetchCategories(): Promise<Category[]> {
  try {
    return await fetchAllPages<Category>(`${BASE_URL}/api/categories/`);
  } catch (err) {
    console.warn("[api] fetchCategories failed – using mock data", err);
    return MOCK_CATEGORIES;
  }
}

export async function fetchItems(): Promise<MenuItem[]> {
  try {
    return await fetchAllPages<MenuItem>(`${BASE_URL}/api/items/`);
  } catch (err) {
    console.warn("[api] fetchItems failed – using mock data", err);
    return MOCK_ITEMS;
  }
}

/* ══════════════════════════════════════════════════════════════
   MOCK / FALLBACK DATA
   Shown when the backend is not reachable (development / demo).
   ══════════════════════════════════════════════════════════════ */

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: "قهوه‌های گرم",     order: 1, item_count: 5, available_count: 5 },
  { id: 2, name: "قهوه‌های سرد",     order: 2, item_count: 4, available_count: 4 },
  { id: 3, name: "نوشیدنی‌های گرم",  order: 3, item_count: 4, available_count: 4 },
  { id: 4, name: "شیرینی و دسر",     order: 4, item_count: 4, available_count: 0 },
];

export const MOCK_ITEMS: MenuItem[] = [
  /* ── قهوه‌های گرم ── */
  { id: 1,  name: "اسپرسو",         description: "قهوه‌ی خالص و غلیظ",            price: 25000, formatted_price: "25,000 تومان", category: 1, category_name: "قهوه‌های گرم",    is_available: true, order: 1, image: null, image_url: null, has_image: false },
  { id: 2,  name: "امریکانو",       description: "اسپرسو با آب داغ",               price: 30000, formatted_price: "30,000 تومان", category: 1, category_name: "قهوه‌های گرم",    is_available: true, order: 2, image: null, image_url: null, has_image: false },
  { id: 3,  name: "لاته",           description: "اسپرسو با شیر داغ",              price: 40000, formatted_price: "40,000 تومان", category: 1, category_name: "قهوه‌های گرم",    is_available: true, order: 3, image: null, image_url: null, has_image: false },
  { id: 4,  name: "کاپوچینو",       description: "اسپرسو با فوم شیر",              price: 40000, formatted_price: "40,000 تومان", category: 1, category_name: "قهوه‌های گرم",    is_available: true, order: 4, image: null, image_url: null, has_image: false },
  { id: 5,  name: "موکا",           description: "قهوه با شکلات و شیر",            price: 45000, formatted_price: "45,000 تومان", category: 1, category_name: "قهوه‌های گرم",    is_available: true, order: 5, image: null, image_url: null, has_image: false },
  /* ── قهوه‌های سرد ── */
  { id: 6,  name: "آیس کافی",       description: "قهوه‌ی سرد با یخ",               price: 35000, formatted_price: "35,000 تومان", category: 2, category_name: "قهوه‌های سرد",    is_available: true, order: 1, image: null, image_url: null, has_image: false },
  { id: 7,  name: "آیس لاته",       description: "لاته سرد با یخ",                 price: 45000, formatted_price: "45,000 تومان", category: 2, category_name: "قهوه‌های سرد",    is_available: true, order: 2, image: null, image_url: null, has_image: false },
  { id: 8,  name: "آیس کاپوچینو",   description: "کاپوچینو سرد با یخ",             price: 45000, formatted_price: "45,000 تومان", category: 2, category_name: "قهوه‌های سرد",    is_available: true, order: 3, image: null, image_url: null, has_image: false },
  { id: 9,  name: "کلد برو",        description: "قهوه دم سرد ۱۲ ساعته",           price: 50000, formatted_price: "50,000 تومان", category: 2, category_name: "قهوه‌های سرد",    is_available: true, order: 4, image: null, image_url: null, has_image: false },
  /* ── نوشیدنی‌های گرم ── */
  { id: 10, name: "چای سیاه",       description: "چای داغ با طعم‌های متنوع",       price: 20000, formatted_price: "20,000 تومان", category: 3, category_name: "نوشیدنی‌های گرم", is_available: true, order: 1, image: null, image_url: null, has_image: false },
  { id: 11, name: "چای سبز",        description: "چای سبز تازه",                   price: 22000, formatted_price: "22,000 تومان", category: 3, category_name: "نوشیدنی‌های گرم", is_available: true, order: 2, image: null, image_url: null, has_image: false },
  { id: 12, name: "دمنوش زنجبیل",   description: "دمنوش گرم زنجبیل و لیمو",        price: 25000, formatted_price: "25,000 تومان", category: 3, category_name: "نوشیدنی‌های گرم", is_available: true, order: 3, image: null, image_url: null, has_image: false },
  { id: 13, name: "شیرکاکائو",      description: "شکلات داغ با شیر کامل",          price: 35000, formatted_price: "35,000 تومان", category: 3, category_name: "نوشیدنی‌های گرم", is_available: true, order: 4, image: null, image_url: null, has_image: false },
  /* ── شیرینی و دسر ── */
  { id: 14, name: "کیک شکلاتی",     description: "کیک خوشمزه‌ی شکلاتی",           price: 55000, formatted_price: "55,000 تومان", category: 4, category_name: "شیرینی و دسر",    is_available: false, order: 1, image: null, image_url: null, has_image: false },
  { id: 15, name: "شیرینی بادام",   description: "شیرینی‌های سنتی بادام",          price: 45000, formatted_price: "45,000 تومان", category: 4, category_name: "شیرینی و دسر",    is_available: false, order: 2, image: null, image_url: null, has_image: false },
  { id: 16, name: "تیرامیسو",       description: "دسر ایتالیایی معروف",            price: 65000, formatted_price: "65,000 تومان", category: 4, category_name: "شیرینی و دسر",    is_available: false, order: 3, image: null, image_url: null, has_image: false },
  { id: 17, name: "پنکیک عسل",      description: "پنکیک داغ با عسل طبیعی",        price: 60000, formatted_price: "60,000 تومان", category: 4, category_name: "شیرینی و دسر",    is_available: false, order: 4, image: null, image_url: null, has_image: false },
];
