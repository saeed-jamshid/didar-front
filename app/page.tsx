"use client";

import { Badge } from "@heroui/react";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { Button, Card } from "@heroui/react";
import {
  fetchCategories,
  fetchItems,
  type Category,
  type MenuItem,
} from "@/lib/api";

/* ════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════ */
interface CartItem {
  item: MenuItem;
  qty: number;
}
type DataState = "loading" | "live" | "error";

/* ════════════════════════════════════════════════
   BRAND TOKENS  (خانه‌ی دیدار)
   ════════════════════════════════════════════════ */
const B = {
  sand: "#cfc5b4",
  sandLight: "#ddd5c6",
  sandDark: "#b8ae9e",
  cream: "#ede8df",
  creamDark: "#e0d9ce",
  green: "#1a4731",
  greenMid: "#2d6a4f",
  greenLight: "#52b788",
  greenPale: "#d4e9dc",
  ink: "#1c1c1a",
  inkMid: "#4a4840",
  inkLight: "#8a8680",
  red: "#a33030",
  amber: "#b06b20",
};

/* ════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════ */
const CAT_EMOJI: Record<number, string> = {
  1: "☕",
  2: "🧊",
  3: "🍵",
  4: "🍰",
};
const TAX_RATE = 0.1;

function formatPrice(raw: number): string {
  return `${Math.round(raw * 1_000).toLocaleString("fa-IR")} تومان`;
}

function useIsMobile() {
  const [mobile, setMobile] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile ?? false;
}

/* ════════════════════════════════════════════════
   ITEM IMAGE  — blur-up with Next.js <Image>
   ════════════════════════════════════════════════ */
// ponytail: HTTP preview uses original images; add preview TLS for optimized thumbnails.
function ItemImage({
  item,
  size = 75,
  radius = 14,
  grayscale = false,
}: {
  item: MenuItem;
  size?: number;
  radius?: number;
  grayscale?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  const showReal = Boolean(item.has_image && item.image_url && !err);

  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
        background: showReal && item.blur_data_url
          ? `url(${item.blur_data_url}) center/cover`
          : `linear-gradient(145deg, ${B.greenPale}, ${B.cream})`,
        filter: grayscale ? "grayscale(1) opacity(0.5)" : "none",
        transition: "filter 0.3s",
      }}
    >
      {/* blur overlay — fades out when real image loads */}
      {showReal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            backdropFilter: loaded ? "none" : "blur(12px)",
            opacity: loaded ? 0 : 1,
            transition: "opacity 0.45s ease",
            pointerEvents: "none",
          }}
        />
      )}

      {showReal ? (
        <Image
          src={item.image_url || ""}
          unoptimized={item.image_url?.startsWith("http://")}
          alt={item.name}
          fill
          sizes={`${size}px`}
          style={{
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.45s ease",
          }}
          placeholder={item.blur_data_url ? "blur" : "empty"}
          blurDataURL={item.blur_data_url ?? undefined}
          onLoad={() => setLoaded(true)}
          onError={() => setErr(true)}
        />
      ) : (
        <img
          src="/default-item.svg"
          alt={item.name}
          style={{
            width: "68%",
            height: "68%",
            objectFit: "contain",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
          }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   SKELETON
   ════════════════════════════════════════════════ */
function SkeletonCard() {
  return (
    <div
      className="flex-row-reverse overflow-hidden"
      style={{
        background: B.cream,
        borderRadius: 18,
        display: "flex",
        gap: 14,
        alignItems: "center",
        border: `1px solid ${B.sandDark}40`,
      }}
    >
      <div
        className="skeleton p-0 rounede rounded-l-xl"
        style={{ width: 75, height: 75, flexShrink: 0 }}
      />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 11, width: "78%" }} />
        <div
          className="skeleton"
          style={{ height: 11, width: "38%", marginTop: 6 }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 9,
        }}
      >
        <div className="skeleton h-20 w-10 mr-auto" />
      </div>
    </div>
  );
}
function SkeletonCat() {
  return (
    <div
      className="skeleton"
      style={{ width: 96, height: 38, borderRadius: 999, flexShrink: 0 }}
    />
  );
}

/* ════════════════════════════════════════════════
   DATA BADGE
   ════════════════════════════════════════════════ */
function DataBadge({ state }: { state: DataState }) {
  if (state === "loading") return null;
  const cfg =
    state === "live"
      ? { bg: "#d4e9dc", color: B.green, dot: "#1a7a47", text: "اتصال به سرور" }
      : { bg: "#f5dada", color: B.red, dot: B.red, text: "خطا در اتصال" };
  return (
    <div
      style={{
        margin: "8px 16px 0",
        background: cfg.bg,
        color: cfg.color,
        borderRadius: 8,
        padding: "5px 12px",
        fontSize: 11,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        direction: "rtl",
        gap: 6,
        animation: "didFadeIn 0.4s ease both",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: cfg.dot,
          display: "inline-block",
        }}
      />
      {cfg.text}
    </div>
  );
}

/* ════════════════════════════════════════════════
   CATEGORY UNAVAILABLE BANNER
   ════════════════════════════════════════════════ */
function CatUnavailBanner({ name }: { name: string }) {
  return (
    <div
      style={{
        background: "#f5ead8",
        border: `1.5px solid ${B.amber}66`,
        borderRadius: 16,
        padding: "16px 18px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        direction: "rtl",
        animation: "didScaleIn 0.3s ease both",
      }}
    >
      <span style={{ fontSize: 30, flexShrink: 0 }}>⏸</span>
      <div>
        <p style={{ fontWeight: 700, fontSize: 14, color: B.amber }}>
          این دسته‌بندی موقتاً در دسترس نیست
        </p>
        <p
          style={{
            fontSize: 12,
            color: B.inkMid,
            marginTop: 5,
            lineHeight: 1.7,
          }}
        >
          تمام آیتم‌های <strong>«{name}»</strong> فعلاً غیرفعال هستند. لطفاً
          بعداً مراجعه فرمایید.
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════ */
function Toast({ name, onDone }: { name: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 108,
        left: "50%",
        transform: "translateX(-50%)",
        background: B.green,
        color: B.cream,
        borderRadius: 14,
        padding: "10px 20px",
        fontSize: 13,
        fontWeight: 500,
        zIndex: 400,
        boxShadow: "0 8px 32px rgba(26,71,49,0.35)",
        animation: "didToastIn 0.3s ease both",
        whiteSpace: "nowrap",
        direction: "rtl",
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: `1px solid ${B.greenMid}`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: B.greenLight,
          display: "inline-block",
        }}
      />
      «{name}» به سبد اضافه شد
    </div>
  );
}

/* ════════════════════════════════════════════════
   ITEM DETAIL  — Modal (desktop) / Sheet (mobile)
   ════════════════════════════════════════════════ */
function ItemModal({
  item,
  isMobile,
  onClose,
  onAdd,
  cartQty,
  allItems,
  onSelectItem,
}: {
  item: MenuItem | null;
  isMobile: boolean;
  onClose: () => void;
  onAdd: (i: MenuItem) => void;
  cartQty: number;
  allItems: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
}) {
  const [added, setAdded] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const [imgErr, setImgErr] = useState(false);
  // Check if browser already has this image cached
  const isAlreadyCached = useCallback((src: string) => {
    if (typeof window === "undefined") return false;
    const img = new window.Image();
    img.src = src;
    return img.complete; // true = already in browser cache
  }, []);

  const normalizedSrc = item?.image_url ?? "";
  const [imgLoaded, setImgLoaded] = useState(() =>
    isAlreadyCached(normalizedSrc),
  );

  useEffect(() => {
    setAdded(false);
    setImgErr(false);
    const src = item?.image_url ?? "";
    setImgLoaded(isAlreadyCached(src)); // pre-warm from cache instead of always false
  }, [item?.id]);

  useEffect(() => {
    setAdded(false);
    setImgErr(false);
    setImgLoaded(false);
  }, [item?.id]);
  if (!item) return null;

  const unavail = !item.is_available;
  const outOfHours = item.is_available && !item.is_time_available;

  const showReal = item.has_image && item.image_url && !imgErr;

  const sameCategory = allItems.filter((i) => i.category === item.category);
  const currentIdx = sameCategory.findIndex((i) => i.id === item.id);
  const prevItem = currentIdx > 0 ? sameCategory[currentIdx - 1] : null;
  const nextItem =
    currentIdx < sameCategory.length - 1 ? sameCategory[currentIdx + 1] : null;

  const handleNavigate = (newItem: MenuItem | null) => {
    if (!newItem) return;
    setDirection(sameCategory.indexOf(newItem) > currentIdx ? "next" : "prev");
    onSelectItem(newItem);
  };

  const handleAdd = () => {
    if (unavail) return;
    onAdd(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold && prevItem) {
      handleNavigate(prevItem);
    } else if (info.offset.x < -swipeThreshold && nextItem) {
      handleNavigate(nextItem);
    }
  };

  const inner = (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: direction === "next" ? 50 : -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction === "next" ? -50 : 50 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      drag
      dragElastic={0.2}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      style={{
        display: "flex",
        flexDirection: "column",
        background: B.cream,
        borderRadius: isMobile ? "26px 26px 0 0" : "2rem",
        overflow: "hidden",
        maxWidth: isMobile ? undefined : 480,
        width: isMobile ? "100%" : "90vw",
        maxHeight: isMobile ? "92vh" : "88vh",
        position: "relative",
        cursor: "grab",
      }}
    >
      {/* Image zone */}
      <div
        style={{
          position: "relative",
          height: isMobile ? 190 : 260,
          flexShrink: 0,
          background: showReal && item.blur_data_url
            ? `url(${item.blur_data_url}) center/cover`
            : `linear-gradient(160deg, ${B.greenPale}, ${B.sandLight})`,
          overflow: "hidden",
          filter: unavail ? "grayscale(0.7) brightness(0.82)" : "none",
          transition: "filter 0.3s",
        }}
      >
        {/* blur overlay for modal hero */}
        {showReal && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              backdropFilter: imgLoaded ? "none" : "blur(16px)",
              opacity: imgLoaded ? 0 : 1,
              transition: "opacity 0.5s ease",
              pointerEvents: "none",
            }}
          />
        )}

        {showReal ? (
          <Image
            src={item.image_url || ""}
            unoptimized={item.image_url?.startsWith("http://")}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 480px"
            style={{
              objectFit: "contain",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 0.5s ease",
            }}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgErr(true)}
            priority
          />
        ) : (
          <img
            src="/default-item.svg"
            alt={item.name}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
              width: isMobile ? "52%" : "46%",
              objectFit: "contain",
              animation: unavail
                ? "none"
                : "didFloat 3.5s ease-in-out infinite",
            }}
          />
        )}

        {/* Navigation arrows (desktop) */}
        {!isMobile && (
          <>
            {prevItem && (
              <motion.button
                onClick={() => handleNavigate(prevItem)}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(26,71,49,0.85)",
                  border: "none",
                  color: B.cream,
                  fontSize: 18,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                }}
              >
                ←
              </motion.button>
            )}
            {nextItem && (
              <motion.button
                onClick={() => handleNavigate(nextItem)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(26,71,49,0.85)",
                  border: "none",
                  color: B.cream,
                  fontSize: 18,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                }}
              >
                →
              </motion.button>
            )}
          </>
        )}

        {/* top-right close on desktop */}
        {!isMobile && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(26,71,49,0.75)",
              border: "none",
              color: B.cream,
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            ✕
          </button>
        )}

        {/* category badge */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            background: `${B.green}dd`,
            borderRadius: 10,
            padding: "4px 11px",
            color: B.cream,
            fontSize: 11,
            fontWeight: 600,
            direction: "rtl",
            zIndex: 10,
          }}
        >
          {item.category_name}
        </div>

        {/* Item counter */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            background: `rgba(26,71,49,0.8)`,
            color: B.cream,
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 11,
            fontWeight: 600,
            zIndex: 10,
          }}
        >
          {currentIdx + 1} / {sameCategory.length}
        </div>

        {/* unavailable overlay */}
        {unavail && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.42)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <div
              style={{
                background: B.red,
                color: "white",
                fontWeight: 700,
                fontSize: 15,
                padding: "8px 26px",
                borderRadius: 10,
                direction: "rtl",
              }}
            >
              ❌ ناموجود
            </div>
          </div>
        )}
      </div>

      {/* drag handle (mobile) */}
      {isMobile && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 44,
              height: 4,
              borderRadius: 4,
              background: `${B.ink}22`,
            }}
          />
        </div>
      )}

      {/* scrollable content */}
      <div
        style={{
          overflowY: "auto",
          flex: 1,
          padding: isMobile ? "16px 20px 28px" : "24px 32px 32px",
          direction: "rtl",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <h2
            style={{
              fontSize: isMobile ? 22 : 26,
              fontWeight: 700,
              color: unavail ? B.inkLight : B.ink,
              fontFamily: "inherit",
              lineHeight: 1.3,
              flex: 1,
            }}
          >
            {item.name}
          </h2>
          <span
            style={{
              fontSize: isMobile ? 17 : 20,
              fontWeight: 700,
              color: unavail ? B.inkLight : B.green,
              flexShrink: 0,
              paddingTop: 4,
            }}
          >
            {formatPrice(item.price)}
          </span>
        </div>

        <p
          style={{
            color: unavail ? B.inkLight : B.inkMid,
            fontSize: isMobile ? 13 : 14,
            lineHeight: 1.9,
            marginTop: 12,
            textAlign: "right",
          }}
        >
          {item.description}
        </p>

        <div
          style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}
        >
          <span
            style={{
              background: unavail
                ? `#f5dada88`
                : outOfHours
                  ? `#f5ead888`
                  : `url('/Asset 6@9x.png') right/cover, ${B.cream}`,
              backgroundBlendMode: unavail || outOfHours ? "normal" : "overlay",
              borderRadius: 10,
              padding: "4px 13px",
              fontSize: 12,
              fontWeight: 600,
              color: unavail ? B.red : B.green,
            }}
          >
            {unavail ? "❌ ناموجود" : "✅ موجود"}
          </span>
          {cartQty > 0 && !unavail && (
            <span
              style={{
                background: "#f5ead8",
                borderRadius: 10,
                padding: "4px 13px",
                fontSize: 12,
                color: B.amber,
                fontWeight: 600,
              }}
            >
              🛒 {cartQty} عدد در سبد
            </span>
          )}
        </div>

        {unavail && (
          <div
            style={{
              background: "#f5ead8",
              borderRadius: 12,
              padding: "12px 15px",
              marginTop: 14,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>⏰</span>
            <p style={{ fontSize: 12, color: B.amber, lineHeight: 1.7 }}>
              این آیتم در حال حاضر موجود نیست. لطفاً بعداً مراجعه فرمایید.
            </p>
          </div>
        )}

        <button
          disabled={unavail}
          onClick={handleAdd}
          style={{
            width: "100%",
            marginTop: 20,
            padding: isMobile ? "14px" : "16px",
            background: unavail ? B.sandDark : added ? B.greenLight : B.green,
            color: unavail ? B.inkLight : B.cream,
            border: "none",
            borderRadius: 16,
            fontSize: isMobile ? 15 : 16,
            fontWeight: 700,
            cursor: unavail ? "not-allowed" : "pointer",
            transition: "all 0.25s ease",
            transform: added ? "scale(0.97)" : "scale(1)",
            boxShadow: unavail ? "none" : `0 6px 22px ${B.green}44`,
            direction: "rtl",
          }}
        >
          {unavail
            ? "این آیتم موجود نیست"
            : added
              ? "✓ اضافه شد!"
              : "افزودن به سبد 🛒"}
        </button>
      </div>
    </motion.div>
  );

  if (isMobile)
    return (
      <>
        <div
          role="presentation"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,20,10,0.6)",
            zIndex: 300,
            animation: "didBackdrop 0.22s ease both",
          }}
        />
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 480,
            zIndex: 301,
          }}
        >
          <AnimatePresence mode="wait">{inner}</AnimatePresence>
        </div>
      </>
    );

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10,20,10,0.55)",
          zIndex: 300,
          animation: "didBackdrop 0.22s ease both",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div role="presentation" onClick={(e) => e.stopPropagation()}>
          <AnimatePresence mode="wait">{inner}</AnimatePresence>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════
   CART  — Sheet (mobile) / Side drawer (desktop)
   ════════════════════════════════════════════════ */
function CartPanel({
  cartItems,
  isMobile,
  onClose,
  onAdd,
  onRemove,
  onDelete,
}: {
  cartItems: CartItem[];
  isMobile: boolean;
  onClose: () => void;
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const subtotal = cartItems.reduce((s, c) => s + c.item.price * c.qty, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const totalCount = cartItems.reduce((s, c) => s + c.qty, 0);

  const panel = (
    <div
      style={{
        background: B.cream,
        display: "flex",
        flexDirection: "column",
        borderRadius: isMobile ? "26px 26px 0 0" : "24px 0 0 24px",
        maxHeight: isMobile ? "90vh" : "100vh",
        width: isMobile ? "100%" : 380,
        animation: isMobile
          ? "didSheetIn 0.33s cubic-bezier(0.32,0.72,0,1) both"
          : "didDrawerIn 0.3s cubic-bezier(0.22,1,0.36,1) both",
        paddingBottom: isMobile ? "env(safe-area-inset-bottom,20px)" : 0,
      }}
    >
      {isMobile && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 44,
              height: 4,
              borderRadius: 4,
              background: `${B.ink}1e`,
            }}
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile ? "12px 20px 10px" : "24px 24px 16px",
          flexShrink: 0,
          direction: "rtl",
          borderBottom: `1px solid ${B.sandDark}44`,
        }}
      >
        <h2
          style={{
            fontFamily: "inherit",
            fontSize: 20,
            fontWeight: 700,
            color: B.ink,
          }}
        >
          سبد خرید
        </h2>
        <button
          onClick={onClose}
          style={{
            background: `${B.ink}12`,
            border: "none",
            borderRadius: 10,
            width: 34,
            height: 34,
            fontSize: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: B.inkMid,
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          overflowY: "auto",
          flex: 1,
          padding: isMobile ? "12px 16px" : "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {cartItems.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "52px 0",
              gap: 14,
            }}
          >
            <img
              src="/default-item.svg"
              alt=""
              style={{ width: 72, opacity: 0.4 }}
            />
            <p style={{ color: B.inkLight, fontSize: 14, direction: "rtl" }}>
              سبد خرید خالی است
            </p>
          </div>
        ) : (
          cartItems.map(({ item, qty }) => (
            <div
              key={item.id}
              style={{
                background: B.sand + "88",
                borderRadius: 16,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: `1px solid ${B.sandDark}55`,
                animation: "didFadeUp 0.3s ease both",
              }}
            >
              <ItemImage
                item={item}
                size={48}
                radius={12}
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  direction: "rtl",
                  textAlign: "right",
                }}
              >
                <p style={{ fontWeight: 600, fontSize: 13, color: B.ink }}>
                  {item.name}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: B.green,
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {formatPrice(item.price * qty)}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => onDelete(item.id)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: "none",
                    background: "#f5dada",
                    color: B.red,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  🗑
                </button>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    background: B.greenPale,
                    borderRadius: 10,
                    padding: "2px 4px",
                  }}
                >
                  <button
                    onClick={() => onRemove(item.id)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      border: "none",
                      background: "white",
                      color: B.green,
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    −
                  </button>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: B.green,
                      minWidth: 22,
                      textAlign: "center",
                    }}
                  >
                    {qty}
                  </span>
                  <button
                    onClick={() => onAdd(item.id)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      border: "none",
                      background: B.green,
                      color: B.cream,
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {cartItems.length > 0 && (
        <div
          style={{
            flexShrink: 0,
            padding: isMobile ? "14px 16px 20px" : "20px 24px 28px",
            borderTop: `1px solid ${B.sandDark}44`,
          }}
        >
          <div style={{ direction: "rtl", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: B.inkMid }}>
              <span>جمع اقلام ({totalCount} آیتم)</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: B.inkMid }}>
              <span>مالیات بر ارزش افزوده (۱۰٪)</span>
              <span>{formatPrice(tax)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${B.sandDark}`, fontWeight: 700 }}>
              <span style={{ color: B.ink }}>مبلغ قابل پرداخت</span>
              <span style={{ fontSize: 19, color: B.green }}>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile)
    return (
      <>
        <div
          role="presentation"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,20,10,0.6)",
            zIndex: 300,
            animation: "didBackdrop 0.22s ease both",
          }}
        />
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 480,
            zIndex: 301,
          }}
        >
          {panel}
        </div>
      </>
    );

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10,20,10,0.45)",
          zIndex: 300,
          animation: "didBackdrop 0.22s ease both",
          backdropFilter: "blur(3px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 301,
        }}
      >
        {panel}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════ */
export default function Home() {
  const isMobile = useIsMobile();

  const [headerImageIndex] = useState(() => Math.floor(Math.random() * 4));
  const headerImage = `/img/${headerImageIndex}.JPG`;

  const [categories, setCategories] = useState<Category[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [dataState, setDataState] = useState<DataState>("loading");

  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [cart, setCart] = useState<Map<number, CartItem>>(new Map());
  const bumpRef = useRef<HTMLSpanElement>(null);

  /* ── load cart from localStorage ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("didarcafe_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        const cartMap = new Map<number, CartItem>(
          parsed.map((item: any) => [
            item.id,
            { item: item.item, qty: item.qty },
          ]),
        );
        setCart(cartMap);
      }
    } catch (err) {
      console.warn("Failed to load cart from localStorage:", err);
    }
  }, []);

  /* ── save cart to localStorage ── */
  useEffect(() => {
    try {
      const cartArray = Array.from(cart.values()).map((c) => ({
        id: c.item.id,
        item: c.item,
        qty: c.qty,
      }));
      localStorage.setItem("didarcafe_cart", JSON.stringify(cartArray));
    } catch (err) {
      console.warn("Failed to save cart to localStorage:", err);
    }
  }, [cart]);

  /* ── load data — caching enabled via next: { revalidate } in lib/api.ts ── */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setDataState("loading");
      let live = false;
      try {
        const url = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
        // revalidate: 60 — Next.js caches this fetch for 60 seconds
        const r = await fetch(`${url}/api/categories/`, {
          next: { revalidate: 60 },
        });
        live = r.ok;
      } catch {
        /* offline */
      }
      const [cats, its] = await Promise.all([fetchCategories(), fetchItems()]);
      if (!alive) return;
      const sortedCats = [...cats].sort((a, b) => a.order - b.order);
      setCategories(sortedCats);
      const sorted = [...its].sort((a, b) => a.order - b.order);
      setAllItems(sorted);
      // Ensure an initial active category is selected when data loads
      //setActiveCat((prev) => prev ?? sortedCats[0]?.id ?? null);
      setDataState(live ? "live" : "error");
    };
    load().catch(() => {
      if (alive) setDataState("error");
    });
    return () => {
      alive = false;
    };
  }, []);

  const cartCount = Array.from(cart.values()).reduce((s, c) => s + c.qty, 0);
  const cartItems = Array.from(cart.values());
  const cartSubtotal = cartItems.reduce((s, c) => s + c.item.price * c.qty, 0);
  const cartTotal = cartSubtotal * (1 + TAX_RATE);

  const bump = () => {
    if (!bumpRef.current) return;
    bumpRef.current.style.animation = "none";
    requestAnimationFrame(() => {
      if (bumpRef.current)
        bumpRef.current.style.animation = "didBump 0.35s ease both";
    });
  };

  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const n = new Map(prev),
        ex = n.get(item.id);
      n.set(item.id, { item, qty: ex ? ex.qty + 1 : 1 });
      return n;
    });
    setToast(item.name);
    bump();
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setCart((prev) => {
      const n = new Map(prev),
        ex = n.get(id);
      if (!ex) return prev;
      ex.qty <= 1 ? n.delete(id) : n.set(id, { ...ex, qty: ex.qty - 1 });
      return n;
    });
  }, []);

  const deleteFromCart = useCallback((id: number) => {
    setCart((prev) => {
      const n = new Map(prev);
      n.delete(id);
      return n;
    });
  }, []);

  const addById = useCallback(
    (id: number) => {
      const item = allItems.find((i) => i.id === id);
      if (item) addToCart(item);
    },
    [allItems, addToCart],
  );

  const activeCatRef = useRef<number | null>(null);
  const suppressScrollSpyRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // keep ref in sync so the scroll handler always reads latest without re-binding
  useEffect(() => {
    activeCatRef.current = activeCat;
  }, [activeCat]);

  useEffect(() => {
    if (!categories.length) return;

    const STICKY_OFFSET = 130; // height of sticky header + category bar

    const computeActive = () => {
      if (suppressScrollSpyRef.current) return;

      let current: number | null = null;
      for (const cat of categories) {
        const el = document.getElementById(`category-${cat.id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - STICKY_OFFSET <= 0) {
          current = cat.id;
        } else {
          break;
        }
      }
      if (current === null) current = categories[0]?.id ?? null;

      if (current !== activeCatRef.current) {
        setActiveCat(current);
      }
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        computeActive();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    computeActive(); // initial

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [categories]);

  const handleCategoryClick = (catId: number) => {
    const el = document.getElementById(`category-${catId}`);
    if (!el) return;

    // immediately set active and suppress scroll-spy until the smooth scroll settles
    suppressScrollSpyRef.current = true;
    setActiveCat(catId);

    el.scrollIntoView({ behavior: "smooth", block: "start" });

    const release = () => {
      suppressScrollSpyRef.current = false;
      window.removeEventListener("scrollend", release);
    };

    if ("onscrollend" in window) {
      window.addEventListener("scrollend", release, { once: true });
    } else {
      // Safari fallback — smooth scrolls rarely exceed ~1s
      setTimeout(release, 1000);
    }
  };

  const isLoading = dataState === "loading";
  const hour = new Date().getHours();
  const greeting =
    hour < 5 || hour >= 21
      ? "شب بخیر"
      : hour < 12
        ? "صبح بخیر"
        : hour < 17
          ? "ظهر بخیر"
          : "عصر بخیر";

  useEffect(() => {
    if (activeCat === null) return;
    const btn = document.getElementById(`cat-btn-${activeCat}`);
    btn?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeCat]);

  return (
    <>
      <style>{`
        @keyframes didFadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes didFadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes didFadeDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes didScaleIn  { from{opacity:0;transform:scale(0.93)} to{opacity:1;transform:scale(1)} }
        @keyframes didSheetIn  { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes didDrawerIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes didModalIn  { from{opacity:0;transform:scale(0.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes didBackdrop { from{opacity:0} to{opacity:1} }
        @keyframes didFloat    { 0%,100%{transform:translate(-50%,-50%) translateY(0)} 50%{transform:translate(-50%,-50%) translateY(-8px)} }
        @keyframes didBump     { 0%{transform:scale(1)} 45%{transform:scale(1.45)} 100%{transform:scale(1)} }
        @keyframes didToastIn  { from{opacity:0;transform:translateX(-50%) translateY(14px) scale(0.9)} to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }
        @keyframes didSlideUp  { from{opacity:0;transform:translateX(-50%) translateY(100%)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

        .skeleton {
          background: linear-gradient(90deg, ${B.sandDark}55 25%, ${B.sandLight}99 50%, ${B.sandDark}55 75%) !important;
          background-size: 400px 100% !important;
          animation: shimmer 1.4s ease-in-out infinite !important;
        }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

        @media (min-width: 768px) {
          .page-wrap { max-width: 1100px !important; margin: 0 auto !important; padding: 0 24px !important; }
          .items-grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 14px !important; }
          .page-header { border-radius: 0 0 40px 40px !important; padding: 48px 40px 28px !important; }
        }
        @media (min-width: 1100px) {
          .items-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>

      <div
        className="page-wrap"
        style={{
          minHeight: "100vh",
          paddingBottom: 110,
          fontFamily: "inherit",
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div
          className="page-header  relative overflow-hidden min-h-[380px]"
          style={{
            borderRadius: "0 0 32px 32px",
            position: "relative",
            overflow: "hidden",
            animation: "didFadeIn 0.5s ease both",
          }}
        >
          <Badge
            className="right-20 hidden top-11/12 z-2 text-[#cfc5b4] py-1 px-2 font-bold bg-[rgb(26,71,49)]"
            variant="soft"
            size="sm"
          >
            ۱۰٪ مالیات بر ارزش افزوده هنگام محاسبه سبد اضافه می‌شود
          </Badge>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              insetInline: 0,
              background: `${B.green}cc`,
              color: B.cream,
              fontSize: 11,
              fontWeight: 600,
              textAlign: "center",
              padding: "6px 12px",
              direction: "rtl",
              backdropFilter: "blur(4px)",
              zIndex: 5,
            }}
          >
            ۱۰٪ مالیات بر ارزش افزوده هنگام محاسبه سبد اضافه می‌شود
          </div>
          <Image
            src="/img/0.JPG"
            fill
            sizes="70vw"
            priority
            alt="Header background"
            className="rounded-b-3xl object-cover lg:rounded-3xl absolute w-full"
          />
          <Image
            src="/img/logo-text.png"
            width={200}
            height={200}
            alt="Picture of the author"
            className=" rounded-3xl object-cover absolute backdrop-blur-md bg-white/20 z-2 p-2 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          />
          <div
            style={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "rgba(82,183,136,0.1)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -30,
              left: -30,
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: "rgba(82,183,136,0.07)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 3,
              height: 28,
              background: `${B.sandLight}55`,
            }}
          />

          <button
            className="right-5 top-5 absolute"
            onClick={() => setCartOpen(true)}
            style={{
              background: cartCount > 0 ? B.green : "rgba(255,255,255,0.12)",
              border: "none",
              borderRadius: 18,
              padding: "9px 15px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              color: cartCount > 0 ? B.green : `${B.cream}cc`,
              fontWeight: 700,
              fontSize: 14,
              transition: "all 0.25s ease",
              boxShadow:
                cartCount > 0 ? `0 4px 14px rgba(26,71,49,0.35)` : "none",
            }}
          >
            <span>🛒</span>
            {cartCount > 0 && (
              <span
                ref={bumpRef}
                style={{
                  background: B.green,
                  borderRadius: 9,
                  padding: "1px 7px",
                  fontSize: 12,
                  color: B.cream,
                  fontWeight: 700,
                }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* ═══ CATEGORY BUTTONS ═══ */}
        <div
          className="rounded-2xl mt-4"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: B.sand,
            borderBottom: `2px solid ${B.sandDark}55`,
            padding: "10px 0",
            paddingTop: 12,
          }}
        >
          <div
            className="hide-scrollbar"
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              padding: "0 16px",
              flexDirection: "row-reverse",
              whiteSpace: "nowrap",
            }}
          >
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCat key={i} />)
              : categories.map((cat) => {
                  const hasAvailable = allItems
                    .filter((i) => i.category === cat.id)
                    .some((i) => i.is_available);
                  const isActive = activeCat === cat.id;

                  return (
                    <Button
                      key={cat.id}
                      id={`cat-btn-${cat.id}`}
                      onPress={() => handleCategoryClick(cat.id)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 999,
                        border: "none",
                        whiteSpace: "nowrap",
                        background: isActive
                          ? B.green
                          : hasAvailable
                            ? B.cream
                            : "#f5dada",
                        color: isActive
                          ? B.cream
                          : hasAvailable
                            ? B.inkMid
                            : B.red,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        boxShadow: `0 1px 4px ${B.ink}11`,
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        direction: "rtl",
                        flexShrink: 0,
                      }}
                    >
                      <span>{cat.name}</span>
                    </Button>
                  );
                })}
          </div>
        </div>

        {/* ═══ ITEMS BY CATEGORY ═══ */}
        <div
          className="bg-[#e1dacf]!"
          style={{ display: "flex", flexDirection: "column", gap: 0 }}
        >
          {isLoading ? (
            <div
              style={{
                padding: "6px 16px 0",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {Array.from({ length: 7 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            categories.map((category, catIdx) => {
              const catItems = allItems.filter(
                (i) => i.category === category.id,
              );
              if (catItems.length === 0) return null;

              const hasAvailable = catItems.some((i) => i.is_available);
              return (
                <Card
                  key={category.id}
                  id={`category-${category.id}`}
                  render={({ children, ...props }) => (
                    <section {...props}>{children}</section>
                  )}
                  className="bg-white/20 mt-6"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* ── Category Header ── */}
                  <div
                    style={{
                      position: "sticky",
                      top: 60,
                      backgroundBlendMode: "overlay",
                      zIndex: 30,
                      paddingTop: 6,
                      paddingBottom: 6,
                      paddingLeft: 16,
                      paddingRight: 16,
                      borderBottom: `2px solid ${B.sandDark}55`,
                      borderTop: `1px solid ${B.sandDark}33`,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      animation: "didFadeDown 0.3s ease both w-full",
                    }}
                    className="rounded-2xl bg-[#cfc5b4] shadow"
                  >
                    <Image
                      className="object-contain"
                      loading="eager"
                      width={12}
                      quality={80}
                      height={12}
                      src="/tree.png"
                      alt="tree"
                    />
                    <div style={{ flex: 1, direction: "rtl" }}>
                      <h3
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: B.ink,
                          margin: 0,
                        }}
                      >
                        {category.name}
                      </h3>
                      <p
                        style={{
                          display: "none",
                          fontSize: 11,
                          color: B.inkLight,
                          margin: "2px 0 0",
                        }}
                      >
                        {catItems.filter((i) => i.is_available).length} موجود از{" "}
                        {catItems.length} مورد
                      </p>
                    </div>
                    {!hasAvailable && (
                      <div
                        style={{
                          background: "#f5dada",
                          color: B.red,
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        ناموجود
                      </div>
                    )}
                  </div>

                  {/* ── Category Items ── */}
                  <div
                    className="px-0 py-3 md:px-4"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {catItems.map((item, i) => {
                      const inCart = cart.get(item.id);
                      const unavail = !item.is_available;
                      const outOfHours = !item.is_available;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.05, 0.2) }}
                          onClick={() => setSelectedItem(item)}
                          style={{
                            background: unavail
                              ? `${B.sandLight}77`
                              : `url('/Asset 6@9x.png') right/cover, ${B.cream}`,
                            backgroundBlendMode: unavail ? "normal" : "overlay",
                            borderRadius: 18,
                            display: "flex",
                            flexDirection: "row-reverse",
                            gap: 12,
                            alignItems: "center",
                            boxShadow: unavail
                              ? "none"
                              : `0 2px 10px ${B.ink}0d`,
                            border: unavail
                              ? `1px dashed ${B.red}66`
                              : outOfHours
                                ? `1px dashed ${B.amber}66`
                                : inCart
                                  ? `1.5px solid ${B.greenLight}`
                                  : `1px solid ${B.sandDark}44`,
                            cursor: "pointer",
                            position: "relative",
                            overflow: "hidden",
                            filter: unavail
                              ? "saturate(0) opacity(0.65)"
                              : outOfHours
                                ? "saturate(0.4) opacity(0.82)"
                                : "none",
                          }}
                        >
                          {/* badges (inCart / unavail / outOfHours) stay as-is, positions unchanged */}
                          {inCart && !unavail && (
                            <div
                              style={{
                                position: "absolute",
                                top: 8,
                                left: 8,
                                background: B.green,
                                borderRadius: 7,
                                padding: "2px 7px",
                                fontSize: 10,
                                color: B.cream,
                                fontWeight: 700,
                                zIndex: 2,
                              }}
                            >
                              ×{inCart.qty}
                            </div>
                          )}
                          {unavail && (
                            <div
                              style={{
                                position: "absolute",
                                top: 9,
                                left: 0,
                                right: 0,
                                display: "flex",
                                justifyContent: "center",
                                zIndex: 4,
                              }}
                            >
                              <span
                                style={{
                                  background: B.red,
                                  color: "white",
                                  fontSize: 9,
                                  fontWeight: 700,
                                  padding: "2px 10px",
                                  borderRadius: 5,
                                  direction: "rtl",
                                  opacity: 0.85,
                                }}
                              >
                                ناموجود
                              </span>
                            </div>
                          )}
                          {outOfHours && (
                            <div
                              style={{
                                position: "absolute",
                                top: 9,
                                left: 0,
                                right: 0,
                                display: "flex",
                                justifyContent: "center",
                                zIndex: 4,
                              }}
                            >
                              <span
                                style={{
                                  background: B.amber,
                                  color: "white",
                                  fontSize: 9,
                                  fontWeight: 700,
                                  padding: "2px 10px",
                                  borderRadius: 5,
                                  direction: "rtl",
                                  opacity: 0.9,
                                }}
                              >
                                خارج از ساعت سرویس
                              </span>
                            </div>
                          )}

                          {/* image — right side */}
                          <ItemImage
                            item={item}
                            size={75}
                            grayscale={unavail}
                          />

                          {/* text + actions — left side */}
                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              direction: "rtl",
                              textAlign: "right",
                              display: "flex",
                              justifyContent: "space-between",
                              alignSelf: "stretch",
                              gap: 8,
                            }}
                          >
                            <div className="my-auto mr-2">
                              <p
                                style={{
                                  fontWeight: 600,
                                  fontSize: 14,
                                  lineHeight: 1.3,
                                  color: unavail ? B.inkLight : B.ink,
                                  textDecoration: unavail
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {item.name}
                              </p>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                  color: unavail ? B.inkLight : B.green,
                                  display: "block",
                                  marginTop: 4,
                                }}
                              >
                                {formatPrice(item.price)}
                              </span>
                              <p
                                style={{
                                  color: unavail
                                    ? `${B.inkLight}99`
                                    : outOfHours
                                      ? B.amber
                                      : B.inkMid,
                                  fontSize: 11,
                                  marginTop: 3,
                                  lineHeight: 1.55,
                                  overflow: "hidden",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                }}
                              >
                                {outOfHours && item.service_name
                                  ? `سرویس ${item.service_name} — از ${item.available_from}`
                                  : item.description}
                              </p>
                            </div>

                            {/* add button — bottom left */}
                            <div
                              className="h-full"
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                className="h-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!unavail) addToCart(item);
                                }}
                                disabled={unavail || outOfHours}
                                title={
                                  unavail
                                    ? "این آیتم موجود نیست"
                                    : "افزودن به سبد"
                                }
                                style={{
                                  width: 34,
                                  border: "none",
                                  background: unavail
                                    ? B.sandDark
                                    : inCart
                                      ? B.greenLight
                                      : B.green,
                                  color: unavail ? B.inkLight : B.cream,
                                  fontSize: unavail ? 13 : 19,
                                  cursor: unavail ? "not-allowed" : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  boxShadow: unavail
                                    ? "none"
                                    : `0 3px 8px ${B.green}44`,
                                  transition:
                                    "transform 0.18s ease, background 0.18s ease",
                                }}
                              >
                                {unavail
                                  ? "✕"
                                  : outOfHours
                                    ? "🕐"
                                    : inCart
                                      ? "✓"
                                      : "+"}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {catIdx < categories.length - 1 && (
                    <div
                      style={{
                        height: 1,
                        background: `linear-gradient(90deg, ${B.sandDark}00, ${B.sandDark}55, ${B.sandDark}00)`,
                        margin: "8px 0",
                      }}
                    />
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* ═══ STICKY CART BAR ═══ */}
        {cartCount > 0 && !cartOpen && !selectedItem && (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setCartOpen(true);
              }
            }}
            onClick={() => setCartOpen(true)}
            style={{
              position: "fixed",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              width: "calc(100% - 28px)",
              maxWidth: 500,
              background: B.green,
              borderRadius: 20,
              padding: "13px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: `0 8px 32px ${B.green}55`,
              animation: "didSlideUp 0.35s cubic-bezier(0.32,0.72,0,1) both",
              zIndex: 100,
              cursor: "pointer",
            }}
          >
            <div>
              <p
                style={{
                  color: `${B.cream}88`,
                  fontSize: 11,
                  direction: "rtl",
                }}
              >
                {cartCount} آیتم انتخاب شده
              </p>
              <p style={{ color: B.cream, fontWeight: 700, fontSize: 15 }}>
                {formatPrice(cartTotal)}
              </p>
            </div>
            <div
              style={{
                background: B.cream,
                borderRadius: 14,
                padding: "9px 18px",
                color: B.green,
                fontWeight: 700,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>مشاهده سبد</span>
              <span>🛒</span>
            </div>
          </div>
        )}

        {/* ═══ OVERLAYS ═══ */}
        {selectedItem && (
          <ItemModal
            item={selectedItem}
            isMobile={isMobile}
            onClose={() => setSelectedItem(null)}
            onAdd={(item) => {
              addToCart(item);
            }}
            cartQty={cart.get(selectedItem.id)?.qty ?? 0}
            allItems={allItems}
            onSelectItem={setSelectedItem}
          />
        )}
        {cartOpen && (
          <CartPanel
            cartItems={cartItems}
            isMobile={isMobile}
            onClose={() => setCartOpen(false)}
            onAdd={addById}
            onRemove={removeFromCart}
            onDelete={deleteFromCart}
          />
        )}
        {toast && <Toast name={toast} onDone={() => setToast(null)} />}

      </div>
    </>
  );
}
