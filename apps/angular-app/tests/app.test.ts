import "@angular/compiler";
import { describe, expect, it } from "vitest";
import { AppComponent } from "../src/app.component.js";

describe("angular app", () => {
  it("counts processed results", () => {
    const app = new AppComponent();
    app.onComplete([{}, {}]);
    app.onComplete([]);
    expect(app.processedCount()).toBe(2);
  });
});
