"use client"; // client hook

import { useEffect } from "react"; // React hook

export function useFocusSection(focus: string | null) {
  useEffect(() => {
    if (!focus) return; // ak nie je focus, nič nerob

    const element = document.getElementById(focus); // nájdi element podľa ID

    if (!element) return; // ak neexistuje, ukonči

    // scroll na sekciu
    element.scrollIntoView({
      behavior: "smooth", // plynulé scrollovanie
      block: "center", // zarovnanie na stred
    });

    // pridanie highlight triedy
    element.classList.add("focus-highlight");

    // Pridaj tooltip element
    const tooltip = document.createElement("div");
    tooltip.className = "focus-tooltip";
    tooltip.innerHTML =
      '<span style="font-weight:600; color:#111;">👉 Začni tu – toto je najdôležitejšia sekcia pre teba</span>';
    tooltip.style.position = "absolute";
    tooltip.style.top = "-2.5rem";
    tooltip.style.left = "1rem";
    tooltip.style.background = "#fff";
    tooltip.style.border = "1px solid #111";
    tooltip.style.borderRadius = "0.5rem";
    tooltip.style.padding = "0.5rem 1rem";
    tooltip.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
    tooltip.style.zIndex = "100";
    tooltip.style.transition = "opacity 0.3s";
    tooltip.style.opacity = "1";
    element.style.position = "relative";
    element.appendChild(tooltip);

    // odstránenie highlight a tooltip po 2 sekundách
    setTimeout(() => {
      element.classList.remove("focus-highlight");
      if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
    }, 2000);
  }, [focus]); // spustí sa pri zmene focus
}
