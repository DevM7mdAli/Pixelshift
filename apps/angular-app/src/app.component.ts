import { ChangeDetectionStrategy, Component } from "@angular/core";
import {
  ImageConverterComponent,
  type ConversionResult,
} from "pixelshift-angular";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [ImageConverterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="app-shell">
      <header class="app-heading">
        <h1>Angular integration</h1>
        <p>Converted in the current session: {{ convertedCount }}</p>
      </header>
      <pixelshift-converter
        [multiple]="true"
        (conversionComplete)="onComplete($event)"
      />
    </main>
  `,
})
export class AppComponent {
  convertedCount = 0;

  onComplete(results: ConversionResult[]): void {
    this.convertedCount = results.length;
  }
}
