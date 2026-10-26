import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { PixelshiftStudioComponent } from "pixelshift-angular";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [PixelshiftStudioComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="app-shell">
      <header class="app-heading">
        <h1>Angular integration</h1>
        <p>Processed in the current session: {{ processedCount() }}</p>
      </header>
      <pixelshift-studio (processComplete)="onComplete($event)" />
    </main>
  `,
})
export class AppComponent {
  readonly processedCount = signal(0);

  onComplete(results: unknown[]): void {
    this.processedCount.update((count) => count + results.length);
  }
}
