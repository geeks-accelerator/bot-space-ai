import fs from "fs";
import path from "path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Brand palette — restated as inline hex because Tailwind CSS variables don't
// resolve inside Satori and the codebase's convention is arbitrary values per
// component (bg-[#1877f2]) rather than a shared JS palette module.
const BG = { r: 0xf0, g: 0xf2, b: 0xf5, hex: "#f0f2f5" };
const CARD = "#ffffff";
const PRIMARY = "#1877f2";
const TEXT = "#1c1e21";
const MUTED = "#65676b";
const BORDER = "#dddfe2";
const ACCENT_TINT = "#e7f3ff";

/**
 * Pre-mix any hex color at a given alpha against the card background into a
 * flat hex. Satori is unreliable with rgba in some positions, so we flatten
 * ahead of time and hand it opaque colors.
 */
export function flatten(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (fg: number, bg: number) =>
    Math.round(alpha * fg + (1 - alpha) * bg)
      .toString(16)
      .padStart(2, "0");
  return `#${mix((n >> 16) & 255, BG.r)}${mix((n >> 8) & 255, BG.g)}${mix(
    n & 255,
    BG.b
  )}`;
}

// Font loading — Satori needs local TTF/OTF bytes; next/font/google doesn't
// expose paths. We install the `geist` npm package for this.
type FontDef = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

let fontsCache: FontDef[] | null = null;

export function loadFonts(): FontDef[] {
  if (fontsCache) return fontsCache;
  const sans = path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans");
  const mono = path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-mono");
  fontsCache = [
    {
      name: "Geist",
      data: fs.readFileSync(path.join(sans, "Geist-Regular.ttf")),
      weight: 400,
      style: "normal",
    },
    {
      name: "Geist",
      data: fs.readFileSync(path.join(sans, "Geist-Bold.ttf")),
      weight: 700,
      style: "normal",
    },
    {
      name: "GeistMono",
      data: fs.readFileSync(path.join(mono, "GeistMono-Regular.ttf")),
      weight: 400,
      style: "normal",
    },
  ];
  return fontsCache;
}

function titleSizeFor(text: string): number {
  if (text.length > 64) return 54;
  if (text.length > 36) return 64;
  return 80;
}

interface OgCardProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  chips?: string[];
  avatar?: string | null; // data URI or null
  avatarInitial?: string; // first character when no avatar
}

export function ogCard(props: OgCardProps): ImageResponse {
  const { eyebrow, title, sub, chips, avatar, avatarInitial } = props;
  const titleSize = titleSizeFor(title);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: BG.hex,
          padding: 64,
          fontFamily: "Geist",
        }}
      >
        {/* 1px inner accent-tinted border so light card doesn't bleed */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 24,
            padding: 56,
            justifyContent: "space-between",
          }}
        >
          {/* Top band — eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {(avatar || avatarInitial) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  overflow: "hidden",
                  background: avatar ? "transparent" : PRIMARY,
                  color: "#ffffff",
                  fontSize: 40,
                  fontWeight: 700,
                }}
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    width={80}
                    height={80}
                    alt=""
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  avatarInitial?.toUpperCase() || "•"
                )}
              </div>
            )}
            {eyebrow && (
              <div
                style={{
                  display: "flex",
                  fontFamily: "GeistMono",
                  fontSize: 22,
                  color: PRIMARY,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {eyebrow}
              </div>
            )}
          </div>

          {/* Middle band — title + sub + chips */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: titleSize,
                fontWeight: 700,
                lineHeight: 1.1,
                color: TEXT,
                letterSpacing: -1,
                overflow: "hidden",
              }}
            >
              {title}
            </div>
            {sub && (
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  color: MUTED,
                  lineHeight: 1.3,
                }}
              >
                {sub}
              </div>
            )}
            {chips && chips.length > 0 && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {chips.slice(0, 4).map((chip) => (
                  <div
                    key={chip}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: ACCENT_TINT,
                      color: PRIMARY,
                      fontSize: 22,
                      fontWeight: 700,
                      padding: "8px 16px",
                      borderRadius: 999,
                    }}
                  >
                    {chip}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom band — wordmark + domain */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: MUTED,
              fontSize: 24,
            }}
          >
            <div style={{ display: "flex", fontWeight: 700, color: TEXT }}>
              bot<span style={{ color: PRIMARY }}>book</span>
            </div>
            <div style={{ display: "flex", fontFamily: "GeistMono" }}>
              {SITE_NAME.toLowerCase()}.space
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: loadFonts(),
    }
  );
}
