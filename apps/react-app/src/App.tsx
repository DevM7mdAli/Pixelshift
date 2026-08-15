import { ImageConverter, type ConversionResult } from "pixelshift-react";
import { useState } from "react";

export function App() {
  const [convertedCount, setConvertedCount] = useState(0);

  return (
    <main className="app-shell">
      <header className="app-heading">
        <h1>React integration</h1>
        <p>Converted in the current session: {convertedCount}</p>
      </header>
      <ImageConverter
        multiple
        onConversionComplete={(event) =>
          setConvertedCount((event.detail as ConversionResult[]).length)
        }
      />
    </main>
  );
}
