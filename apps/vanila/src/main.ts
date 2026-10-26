import { ar, registerLocale } from "pixelshift-web-core";
import "pixelshift-web-core/define";
import "../../shared.css";

registerLocale("ar", ar);

const toggle = document.querySelector<HTMLInputElement>("#dark-mode");
const language = document.querySelector<HTMLSelectElement>("#language");
const studio = document.querySelector("pixelshift-studio");

toggle?.addEventListener("change", () => {
  document.documentElement.classList.toggle("dark", toggle.checked);
  if (studio) studio.isDarkMode = toggle.checked;
});

// The elements follow the page's own `lang` and `dir`, as a real app sets them.
language?.addEventListener("change", () => {
  document.documentElement.lang = language.value;
  document.documentElement.dir = language.value === "ar" ? "rtl" : "ltr";
});
