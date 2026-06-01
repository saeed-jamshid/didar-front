"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
type DataState = "loading" | "live" | "mock" | "error";

/* ════════════════════════════════════════════════
   BRAND TOKENS  (خانه‌ی دیدار)
   ════════════════════════════════════════════════ */
const B = {
  sand: "#cfc5b4", // main bg
  sandLight: "#ddd5c6",
  sandDark: "#b8ae9e",
  cream: "#ede8df", // card bg
  creamDark: "#e0d9ce",
  green: "#1a4731", // primary dark green
  greenMid: "#2d6a4f",
  greenLight: "#52b788",
  greenPale: "#d4e9dc",
  ink: "#1c1c1a", // text
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

function useIsMobile() {
  const [mobile, setMobile] = useState(true);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

/* ════════════════════════════════════════════════
   ITEM IMAGE
   ════════════════════════════════════════════════ */
function ItemImage({
  item,
  size = 64,
  radius = 14,
  grayscale = false,
}: {
  item: MenuItem;
  size?: number;
  radius?: number;
  grayscale?: boolean;
}) {
  const [err, setErr] = useState(false);
  const show = item.has_image && item.image_url && !err;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: `linear-gradient(145deg, ${B.greenPale}, ${B.cream})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        filter: grayscale ? "grayscale(1) opacity(0.5)" : "none",
        transition: "filter 0.3s",
        border: `1px solid ${B.sandDark}44`,
      }}
    >
      {show ? (
        <img
          src={item.image_url!}
          alt={item.name}
          onError={() => setErr(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <img
          src="/default-item.svg"
          alt={item.name}
          style={{ width: "68%", height: "68%", objectFit: "contain" }}
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
      style={{
        background: B.cream,
        borderRadius: 18,
        padding: "14px 16px",
        display: "flex",
        gap: 14,
        alignItems: "center",
        border: `1px solid ${B.sandDark}40`,
      }}
    >
      <div
        className="skeleton"
        style={{ width: 64, height: 64, borderRadius: 14, flexShrink: 0 }}
      />
      <div style={{ flex: 1 }}>
        <div
          className="skeleton"
          style={{ height: 14, width: "50%", marginBottom: 9 }}
        />
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
        <div className="skeleton" style={{ height: 13, width: 72 }} />
        <div
          className="skeleton"
          style={{ width: 34, height: 34, borderRadius: 10 }}
        />
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
  const cfg = {
    live: {
      bg: "#d4e9dc",
      color: B.green,
      dot: "#1a7a47",
      text: "اتصال به سرور",
    },
    mock: { bg: "#f5ead8", color: B.amber, dot: "#c27c2c", text: "داده نمونه" },
    error: { bg: "#f5dada", color: B.red, dot: B.red, text: "خطا در اتصال" },
  }[state];
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
}: {
  item: MenuItem | null;
  isMobile: boolean;
  onClose: () => void;
  onAdd: (i: MenuItem) => void;
  cartQty: number;
}) {
  const [added, setAdded] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  useEffect(() => {
    setAdded(false);
    setImgErr(false);
  }, [item?.id]);
  if (!item) return null;

  const unavail = !item.is_available;
  const showReal = item.has_image && item.image_url && !imgErr;

  const handleAdd = () => {
    if (unavail) return;
    onAdd(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  };

  /* ── shared inner content ── */
  const inner = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: B.cream,
        /* arch top on desktop */
        borderRadius: isMobile ? "26px 26px 0 0" : "120px 120px 24px 24px",
        overflow: "hidden",
        maxWidth: isMobile ? undefined : 480,
        width: isMobile ? "100%" : "90vw",
        maxHeight: isMobile ? "92vh" : "88vh",
        position: "relative",
        animation: isMobile
          ? "didSheetIn 0.33s cubic-bezier(0.32,0.72,0,1) both"
          : "didModalIn 0.28s cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      {/* Image zone — arched on desktop */}
      <div
        style={{
          position: "relative",
          height: isMobile ? 190 : 260,
          flexShrink: 0,
          background: `linear-gradient(160deg, ${B.greenPale}, ${B.sandLight})`,
          overflow: "hidden",
          filter: unavail ? "grayscale(0.7) brightness(0.82)" : "none",
          transition: "filter 0.3s",
        }}
      >
        {showReal ? (
          <img
            src={item.image_url!}
            alt={item.name}
            onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
          }}
        >
          {CAT_EMOJI[item.category] ?? "🍽"} {item.category_name}
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
        {/* name + price row */}
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
            {item.formatted_price}
          </span>
        </div>

        {/* description */}
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

        {/* status pills */}
        <div
          style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}
        >
          <span
            style={{
              background: unavail ? "#f5dada" : B.greenPale,
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

        {/* unavailable notice */}
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

        {/* add button */}
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
    </div>
  );

  /* ── mobile: bottom sheet ── */
  if (isMobile)
    return (
      <>
        <div
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
          {inner}
        </div>
      </>
    );

  /* ── desktop: centered modal ── */
  return (
    <>
      <div
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
        <div onClick={(e) => e.stopPropagation()}>{inner}</div>
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
  const total = cartItems.reduce((s, c) => s + c.item.price * c.qty, 0);
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
      {/* handle */}
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

      {/* header */}
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

      {/* items */}
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
              <ItemImage item={item} size={48} radius={12} />
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
                  {(item.price * qty).toLocaleString("fa-IR")} تومان
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

      {/* footer */}
      {cartItems.length > 0 && (
        <div
          style={{
            flexShrink: 0,
            padding: isMobile ? "14px 16px 20px" : "20px 24px 28px",
            borderTop: `1px solid ${B.sandDark}44`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              direction: "rtl",
            }}
          >
            <span style={{ color: B.inkMid, fontSize: 13 }}>
              {totalCount} آیتم
            </span>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: B.inkLight }}>مبلغ کل</p>
              <p style={{ fontSize: 19, fontWeight: 700, color: B.green }}>
                {total.toLocaleString("fa-IR")} تومان
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* mobile: bottom sheet */
  if (isMobile)
    return (
      <>
        <div
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

  /* desktop: right side drawer */
  return (
    <>
      <div
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

  /* data */
  const [categories, setCategories] = useState<Category[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [dataState, setDataState] = useState<DataState>("loading");

  /* ui */
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* cart */
  const [cart, setCart] = useState<Map<number, CartItem>>(new Map());
  const bumpRef = useRef<HTMLSpanElement>(null);

  /* ── load ── */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setDataState("loading");
      let live = false;
      try {
        const url = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
        const r = await fetch(`${url}/api/categories/`, { cache: "no-store" });
        live = r.ok;
      } catch {
        /* offline */
      }
      const [cats, its] = await Promise.all([fetchCategories(), fetchItems()]);
      if (!alive) return;
      setCategories([...cats].sort((a, b) => a.order - b.order));
      const sorted = [...its].sort((a, b) => a.order - b.order);
      setAllItems(sorted);
      setItems(sorted);
      setDataState(live ? "live" : "mock");
    };
    load().catch(() => {
      if (alive) setDataState("error");
    });
    return () => {
      alive = false;
    };
  }, []);

  /* ── filter ── */
  useEffect(() => {
    const base =
      activeCat === null
        ? allItems
        : allItems.filter((i) => i.category === activeCat);
    setItems([...base].sort((a, b) => a.order - b.order));
  }, [activeCat, allItems]);

  /* ── cart helpers ── */
  const cartCount = Array.from(cart.values()).reduce((s, c) => s + c.qty, 0);
  const cartItems = Array.from(cart.values());
  const cartTotal = cartItems.reduce((s, c) => s + c.item.price * c.qty, 0);

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

  /* ── computed ── */
  const activeCatData = categories.find((c) => c.id === activeCat);
  const activeCatAllGone =
    activeCat !== null && activeCatData?.available_count === 0;
  const isLoading = dataState === "loading";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صبح بخیر" : hour < 17 ? "ظهر بخیر" : "عصر بخیر";

  return (
    <>
      {/* ── CSS animations (scoped keyframes) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap');

        body { font-family: 'Vazirmatn', 'DM Sans', sans-serif !important; }

        @keyframes didFadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes didFadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes didScaleIn  { from{opacity:0;transform:scale(0.93)} to{opacity:1;transform:scale(1)} }
        @keyframes didSheetIn  { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes didDrawerIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes didModalIn  { from{opacity:0;transform:scale(0.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes didBackdrop { from{opacity:0} to{opacity:1} }
        @keyframes didFloat    { 0%,100%{transform:translate(-50%,-50%) translateY(0)} 50%{transform:translate(-50%,-50%) translateY(-8px)} }
        @keyframes didBump     { 0%{transform:scale(1)} 45%{transform:scale(1.45)} 100%{transform:scale(1)} }
        @keyframes didToastIn  { from{opacity:0;transform:translateX(-50%) translateY(14px) scale(0.9)} to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }
        @keyframes didSlideUp  { from{opacity:0;transform:translateX(-50%) translateY(100%)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

        /* skeleton override to match sand theme */
        .skeleton {
          background: linear-gradient(90deg, ${B.sandDark}55 25%, ${B.sandLight}99 50%, ${B.sandDark}55 75%) !important;
          background-size: 400px 100% !important;
          animation: shimmer 1.4s ease-in-out infinite !important;
        }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

        /* desktop layout */
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
          background: B.sand,
          minHeight: "100vh",
          paddingBottom: 110,
          fontFamily: "inherit",
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div
          className="page-header"
          style={{
            background: B.green,
            padding: "38px 20px 22px",
            borderRadius: "0 0 32px 32px",
            position: "relative",
            overflow: "hidden",
            animation: "didFadeIn 0.5s ease both",
          }}
        >
          {/* bg decorations */}
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
          {/* arch lamp motif (top center) */}
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

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              direction: "rtl",
              position: "relative",
            }}
          >
            <div>
              <p
                style={{
                  color: B.greenLight,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: 0.5,
                }}
              >
                {greeting} 🌿
              </p>
              {/* Logo text */}
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: B.cream,
                  marginTop: 3,
                  lineHeight: 1.25,
                  letterSpacing: -0.3,
                }}
              >
                خانه‌ی دیدار
              </h1>
              <p style={{ color: `${B.sand}99`, fontSize: 12, marginTop: 3 }}>
                منوی نوشیدنی و دسر
              </p>
            </div>

            {/* Cart button */}
            <button
              onClick={() => setCartOpen(true)}
              style={{
                background: cartCount > 0 ? B.cream : "rgba(255,255,255,0.12)",
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
        </div>

        {/* ═══ DATA BADGE ═══
          <DataBadge state={dataState} /> */}
        {/* ═══ CATEGORIES ═══ */}
        <div style={{ padding: "18px 0 0" }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: B.ink,
              margin: "0 0 10px 16px",
              direction: "rtl",
              textAlign: "right",
              animation: "didFadeUp 0.45s 0.12s ease both",
              opacity: 0,
              animationFillMode: "both",
            }}
          >
            دسته‌بندی‌ها
          </h2>

          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              padding: "2px 16px 4px",
              flexDirection: "row-reverse",
            }}
          >
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonCat key={i} />)
            ) : (
              <>
                {/* All */}
                <button
                  onClick={() => setActiveCat(null)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 999,
                    border: "none",
                    whiteSpace: "nowrap",
                    background: activeCat === null ? B.green : B.cream,
                    color: activeCat === null ? B.cream : B.inkMid,
                    fontWeight: activeCat === null ? 700 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                    boxShadow:
                      activeCat === null
                        ? `0 4px 12px ${B.green}44`
                        : `0 1px 4px ${B.ink}11`,
                    transition: "all 0.22s ease",
                    animation: "didScaleIn 0.35s 0.18s ease both",
                    opacity: 0,
                    animationFillMode: "both",
                  }}
                >
                  همه ({allItems.length})
                </button>

                {categories.map((cat, i) => {
                  const isActive = activeCat === cat.id;
                  const gone = cat.available_count === 0;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCat(cat.id)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 999,
                        border: "none",
                        whiteSpace: "nowrap",
                        background: isActive
                          ? gone
                            ? "#7f1d1d"
                            : B.green
                          : gone
                            ? "#f5dada"
                            : B.cream,
                        color: isActive ? B.cream : gone ? B.red : B.inkMid,
                        fontWeight: isActive ? 700 : 400,
                        fontSize: 13,
                        cursor: "pointer",
                        boxShadow: isActive
                          ? `0 4px 12px ${B.green}44`
                          : `0 1px 4px ${B.ink}11`,
                        transition: "all 0.22s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        direction: "rtl",
                        animation: `didScaleIn 0.35s ${0.07 * i + 0.22}s ease both`,
                        opacity: 0,
                        animationFillMode: "both",
                        position: "relative",
                      }}
                    >
                      {gone && (
                        <span
                          style={{
                            position: "absolute",
                            top: -3,
                            right: -3,
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: B.red,
                            border: `2px solid ${B.sand}`,
                          }}
                        />
                      )}
                      <span>{CAT_EMOJI[cat.id] ?? "🍽"}</span>
                      <span>{cat.name}</span>
                      <span
                        style={{
                          background: isActive
                            ? "rgba(237,232,223,0.2)"
                            : `${B.ink}0f`,
                          borderRadius: 8,
                          padding: "1px 6px",
                          fontSize: 10,
                          color: gone && !isActive ? B.red : "inherit",
                        }}
                      >
                        {cat.available_count}/{cat.item_count}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* ═══ CATEGORY UNAVAILABLE BANNER ═══ */}
        {!isLoading && activeCatAllGone && activeCatData && (
          <div style={{ padding: "12px 16px 0" }}>
            <CatUnavailBanner name={activeCatData.name} />
          </div>
        )}

        {/* ═══ ITEMS COUNT ═══ */}
        {!isLoading && !activeCatAllGone && (
          <p
            style={{
              fontSize: 12,
              color: B.inkLight,
              padding: "10px 18px 2px",
              direction: "rtl",
              textAlign: "right",
              animation: "didFadeIn 0.4s ease both",
            }}
          >
            {items.filter((i) => i.is_available).length} موجود از {items.length}{" "}
            مورد
          </p>
        )}

        {/* ═══ MENU ITEMS ═══ */}
        <div
          className="items-grid"
          style={{
            padding: "6px 16px 0",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {isLoading
            ? Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)
            : items.map((item, i) => {
                const inCart = cart.get(item.id);
                const unavail = !item.is_available;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      background: unavail ? `${B.sandLight}77` : B.cream,
                      borderRadius: 18,
                      padding: "14px 16px",
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      boxShadow: unavail ? "none" : `0 2px 10px ${B.ink}0d`,
                      border: inCart
                        ? `1.5px solid ${B.greenLight}`
                        : unavail
                          ? `1px dashed ${B.sandDark}`
                          : `1px solid ${B.sandDark}44`,
                      animation: `didFadeUp 0.38s ${Math.min(i * 0.04, 0.32)}s ease both`,
                      opacity: 0,
                      animationFillMode: "both",
                      cursor: "pointer",
                      transition: "transform 0.14s, box-shadow 0.2s",
                      position: "relative",
                      overflow: "hidden",
                      filter: unavail ? "saturate(0.25) opacity(0.7)" : "none",
                    }}
                    onTouchStart={(e) => {
                      if (!unavail)
                        e.currentTarget.style.transform = "scale(0.975)";
                    }}
                    onTouchEnd={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                    onMouseEnter={(e) => {
                      if (!unavail)
                        e.currentTarget.style.boxShadow = `0 6px 20px ${B.ink}1a`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = unavail
                        ? "none"
                        : `0 2px 10px ${B.ink}0d`;
                    }}
                  >
                    {/* qty badge */}
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
                    {/* unavailable tag */}
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

                    <ItemImage
                      item={item}
                      size={64}
                      radius={14}
                      grayscale={unavail}
                    />

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        direction: "rtl",
                        textAlign: "right",
                      }}
                    >
                      <p
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          lineHeight: 1.3,
                          color: unavail ? B.inkLight : B.ink,
                          textDecoration: unavail ? "line-through" : "none",
                        }}
                      >
                        {item.name}
                      </p>
                      <p
                        style={{
                          color: unavail ? `${B.inkLight}99` : B.inkMid,
                          fontSize: 11,
                          marginTop: 3,
                          lineHeight: 1.55,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {item.description}
                      </p>
                      <p
                        style={{
                          color: unavail ? B.sandDark : B.inkLight,
                          fontSize: 10,
                          marginTop: 4,
                        }}
                      >
                        {CAT_EMOJI[item.category] ?? ""} {item.category_name}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          color: unavail ? B.inkLight : B.green,
                        }}
                      >
                        {item.formatted_price}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!unavail) addToCart(item);
                        }}
                        disabled={unavail}
                        title={
                          unavail ? "این آیتم موجود نیست" : "افزودن به سبد"
                        }
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
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
                          transition: "all 0.2s ease",
                        }}
                      >
                        {unavail ? "✕" : inCart ? "✓" : "+"}
                      </button>
                    </div>
                  </div>
                );
              })}
        </div>

        {/* ═══ STICKY CART BAR ═══ */}
        {cartCount > 0 && !cartOpen && !selectedItem && (
          <div
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
                {cartTotal.toLocaleString("fa-IR")} تومان
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
        <footer className="items-center hidden justify-center py-3">
          <a
            className="flex items-center gap-1 text-current no-underline"
            href="https://heroui.com?utm_source=next-app-template"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="text-muted">Powered by</span>
            <p className="text-accent">Saeed & Jamshid</p>
          </a>
        </footer>
      </div>
    </>
  );
}
