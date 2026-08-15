import "@angular/compiler";
import { describe, expect, it } from "vitest";
import { AppComponent } from "../src/app.component.js";

describe("angular app", () => {
  it("updates its wrapper result state", () => {
    const app = new AppComponent();
    app.onComplete([]);
    expect(app.convertedCount).toBe(0);
  });
});
