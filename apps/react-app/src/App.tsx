import { PixelshiftStudio } from "pixelshift-react";
import { useState } from "react";

export function App() {
  const [processedCount, setProcessedCount] = useState(0);

  return (
    <main className="app-shell">
      <header className="app-heading">
        <h1>React integration</h1>
        <p>Processed in the current session: {processedCount}</p>
      </header>
      <PixelshiftStudio
        onProcessComplete={(event) =>
          setProcessedCount((count) => count + event.detail.length)
        }
      />
    </main>
  );
}
