import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app.component.js";

bootstrapApplication(AppComponent).catch((error: unknown) =>
  console.error(error),
);
