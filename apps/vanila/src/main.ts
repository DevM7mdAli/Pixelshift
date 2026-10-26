import "pixelshift-web-core/define";
import "../../shared.css";

const toggle = document.querySelector<HTMLInputElement>("#dark-mode");
const studio = document.querySelector("pixelshift-studio");

toggle?.addEventListener("change", () => {
  document.documentElement.classList.toggle("dark", toggle.checked);
  if (studio) studio.isDarkMode = toggle.checked;
});
