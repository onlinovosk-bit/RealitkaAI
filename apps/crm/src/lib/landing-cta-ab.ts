export const LANDING_CTA_AB_STORAGE_KEY = "revolis_ai_landing_cta_ab_v1";

export type LandingCtaVariant = "a" | "b";

export function getLandingCtaCopy(variant: LandingCtaVariant) {
  if (variant === "b") {
    return {
      hero: {
        primary: "Spustiť AI asistenta",
        secondary: "Prihlásiť sa",
      },
      finalCta: {
        title: "Odomkni viac uzavretí s AI",
        subtitle:
          "AI pripraví ďalší krok a skript — ty rozhoduješ, ty uzatváraš.",
        button: "Začať s Revolis.AI",
      },
    };
  }
  return {
    hero: {
      primary: "Začať zdarma",
      secondary: "Prihlásiť sa",
    },
    finalCta: {
      title: "Začni uzatvárať viac obchodov ešte dnes",
      subtitle:
        "Superpower pre makléra: jasné ďalšie kroky, menej chaosu, viac uzavretí.",
      button: "Spusti Revolis.AI",
    },
  };
}
