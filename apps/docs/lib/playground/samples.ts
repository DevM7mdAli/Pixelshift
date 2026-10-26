export interface Sample {
  id: string;
  label: string;
  /** What this image is good for testing. */
  purpose: string;
  make(): Promise<File>;
}

type Draw = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => void;

async function render(
  name: string,
  type: "image/png" | "image/jpeg",
  width: number,
  height: number,
  draw: Draw,
): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available.");
  draw(context, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, 0.92),
  );
  if (!blob) throw new Error("The browser could not encode the sample.");
  return new File([blob], name, { type });
}

/** A deterministic pseudo-random sequence, so every load draws the same pixels. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const photo: Draw = (context, width, height) => {
  const random = seeded(7);
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#1e3a5f");
  sky.addColorStop(0.55, "#f2a65a");
  sky.addColorStop(1, "#7a3b2e");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255, 244, 214, 0.95)";
  context.beginPath();
  context.arc(width * 0.72, height * 0.38, height * 0.11, 0, Math.PI * 2);
  context.fill();

  for (const [shade, base, amplitude] of [
    ["#3b2a35", 0.62, 0.1],
    ["#241a26", 0.74, 0.08],
    ["#120d17", 0.86, 0.06],
  ] as const) {
    context.fillStyle = shade;
    context.beginPath();
    context.moveTo(0, height);
    for (let x = 0; x <= width; x += 20) {
      const y =
        height * base +
        Math.sin(x / (width * 0.09) + base * 9) * height * amplitude +
        Math.sin(x / (width * 0.03)) * height * 0.015;
      context.lineTo(x, y);
    }
    context.lineTo(width, height);
    context.fill();
  }

  // Film grain keeps the JPEG from being trivially compressible.
  for (let index = 0; index < width * height * 0.02; index += 1) {
    context.fillStyle = `rgba(255, 255, 255, ${random() * 0.07})`;
    context.fillRect(random() * width, random() * height, 2, 2);
  }
};

const product: Draw = (context, width, height) => {
  const backdrop = context.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.1,
    width / 2,
    height / 2,
    width * 0.7,
  );
  backdrop.addColorStop(0, "#ffffff");
  backdrop.addColorStop(1, "#e9e9e9");
  context.fillStyle = backdrop;
  context.fillRect(0, 0, width, height);

  context.save();
  context.filter = "blur(18px)";
  context.fillStyle = "rgba(0, 0, 0, 0.14)";
  context.beginPath();
  context.ellipse(
    width / 2,
    height * 0.8,
    width * 0.22,
    height * 0.045,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();

  context.fillStyle = "#1e6091";
  context.beginPath();
  context.roundRect(
    width * 0.33,
    height * 0.2,
    width * 0.34,
    height * 0.54,
    40,
  );
  context.fill();
  context.lineWidth = width * 0.04;
  context.strokeStyle = "#1e6091";
  context.beginPath();
  context.arc(
    width * 0.69,
    height * 0.45,
    height * 0.1,
    -Math.PI / 2,
    Math.PI / 2,
  );
  context.stroke();
  context.fillStyle = "#ffffff";
  context.fillRect(width * 0.4, height * 0.36, width * 0.2, height * 0.16);
  context.fillStyle = "#ff6838";
  context.font = `bold ${height * 0.075}px sans-serif`;
  context.textAlign = "center";
  context.fillText("PX", width / 2, height * 0.475);
};

const logo: Draw = (context, width, height) => {
  // No background fill: the PNG keeps its alpha channel.
  context.fillStyle = "#151614";
  context.beginPath();
  context.roundRect(
    width * 0.1,
    height * 0.1,
    width * 0.8,
    height * 0.8,
    width * 0.18,
  );
  context.fill();
  context.fillStyle = "#caff45";
  context.fillRect(width * 0.24, height * 0.24, width * 0.34, height * 0.34);
  context.fillStyle = "#ff6838";
  context.beginPath();
  context.arc(width * 0.62, height * 0.62, width * 0.17, 0, Math.PI * 2);
  context.fill();
};

const screenshot: Draw = (context, width, height) => {
  context.fillStyle = "#f6f5f0";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, 64);
  context.fillStyle = "#151614";
  context.font = "600 22px sans-serif";
  context.fillText("Dashboard", 32, 40);

  const colors = ["#2f7d45", "#ff6838", "#1e6091", "#caff45"];
  colors.forEach((color, index) => {
    const x = 32 + index * ((width - 64) / 4);
    context.fillStyle = "#ffffff";
    context.fillRect(x, 100, (width - 64) / 4 - 16, 150);
    context.fillStyle = color;
    context.fillRect(x + 20, 124, 56, 56);
    context.fillStyle = "#151614";
    context.font = "600 28px sans-serif";
    context.fillText(String(1200 + index * 340), x + 20, 222);
  });

  context.fillStyle = "#ffffff";
  context.fillRect(32, 290, width - 64, height - 330);
  context.fillStyle = "#1e6091";
  const bars = 28;
  for (let index = 0; index < bars; index += 1) {
    const barHeight = 60 + ((index * 53) % 220);
    context.fillRect(
      60 + index * ((width - 120) / bars),
      height - 60 - barHeight,
      ((width - 120) / bars) * 0.6,
      barHeight,
    );
  }
};

export const SAMPLES: Sample[] = [
  {
    id: "photo",
    label: "Landscape photo",
    purpose: "JPEG with grain — compression and quality",
    make: () => render("landscape.jpg", "image/jpeg", 1600, 1000, photo),
  },
  {
    id: "product",
    label: "Product on white",
    purpose: "Soft backdrop and shadow — background removal",
    make: () => render("mug.jpg", "image/jpeg", 1200, 900, product),
  },
  {
    id: "logo",
    label: "Logo with alpha",
    purpose: "Transparent PNG — formats, colors, JPEG backgrounds",
    make: () => render("logo.png", "image/png", 800, 800, logo),
  },
  {
    id: "screenshot",
    label: "UI screenshot",
    purpose: "Flat colors and text — PNG palette compression",
    make: () => render("screenshot.png", "image/png", 1440, 900, screenshot),
  },
  {
    id: "large",
    label: "Large 4K photo",
    purpose: "3840 × 2160 — resizing, YouTube thumbnail limits",
    make: () => render("large.jpg", "image/jpeg", 3840, 2160, photo),
  },
];

const cache = new Map<string, Promise<File>>();

/** Draws a sample once; later calls get a copy of the same bytes. */
export function loadSample(id: string): Promise<File> {
  const sample = SAMPLES.find((candidate) => candidate.id === id);
  if (!sample) return Promise.reject(new Error(`Unknown sample "${id}".`));
  let pending = cache.get(id);
  if (!pending) {
    pending = sample.make();
    cache.set(id, pending);
  }
  return pending.then(
    (file) => new File([file], file.name, { type: file.type }),
  );
}
