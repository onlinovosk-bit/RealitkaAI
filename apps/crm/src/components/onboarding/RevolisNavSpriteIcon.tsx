"use client";

/**
 * Výrez z oficiálnej mriežky ikon Revolis (2 riady × 4 stĺpce).
 * Indexy 0–7: rad 1 zľava PREHĽAD, ZÁUJEMCOVIA, ÚLOHY, STAV KLIENTOV; rad 2 MOJE PONUKY, NAHRAŤ ZÁUJEMCOV, ÚČET, NASTAVENIA.
 * Obrázok: /images/revolis-nav-sprite.png
 */
const COLS = 4;
const ROWS = 2;
export const SPRITE_PATH = "/images/revolis-nav-sprite.png";

export const REVOLIS_NAV_SPRITE = {
  prehlad: 0,
  zaujemcovia: 1,
  ulohy: 2,
  stavKlientov: 3,
  mojePonuky: 4,
  nahratZaujemcov: 5,
  ucet: 6,
  nastavenia: 7,
} as const;

type Props = {
  /** 0–7 */
  index: number;
  size?: number;
  className?: string;
  title?: string;
};

export default function RevolisNavSpriteIcon({ index, size = 32, className = "", title }: Props) {
  const i = Math.min(Math.max(0, index), COLS * ROWS - 1);
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const posX = COLS > 1 ? (col / (COLS - 1)) * 100 : 0;
  const posY = ROWS > 1 ? (row / (ROWS - 1)) * 100 : 0;

  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      title={title}
      className={`inline-block shrink-0 rounded-md bg-slate-200/80 ring-1 ring-slate-300/50 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${SPRITE_PATH})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
        backgroundPosition: `${posX}% ${posY}%`,
      }}
    />
  );
}
