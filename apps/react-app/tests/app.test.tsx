// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/App.js";

describe("react app", () => {
  it("renders the React wrapper", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,",
    );
    const { container } = render(<App />);
    expect(screen.getByText("React integration")).toBeTruthy();
    expect(container.querySelector("pixelshift-image-converter")).toBeTruthy();
  });
});
