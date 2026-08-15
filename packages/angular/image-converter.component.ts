import "pixelshift-web-core/define";
import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import type {
  ConversionResult,
  ImageConverterElement,
  OutputFormat,
} from "pixelshift-web-core";

@Component({
  selector: "pixelshift-converter",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <pixelshift-image-converter
      #converter
      [format]="format"
      [quality]="quality"
      [maxWidth]="maxWidth"
      [maxHeight]="maxHeight"
      [multiple]="multiple"
      [disabled]="disabled"
      (conversion-start)="conversionStart.emit()"
      (conversion-complete)="conversionComplete.emit($any($event).detail)"
      (conversion-error)="conversionError.emit($any($event).detail)"
      (files-selected)="filesSelected.emit($any($event).detail)"
    ></pixelshift-image-converter>
  `,
})
export class ImageConverterComponent {
  @Input() format: OutputFormat = "webp";
  @Input() quality = 0.85;
  @Input() maxWidth?: number;
  @Input() maxHeight?: number;
  @Input() multiple = false;
  @Input() disabled = false;

  @Output() readonly conversionStart = new EventEmitter<void>();
  @Output() readonly conversionComplete = new EventEmitter<
    ConversionResult[]
  >();
  @Output() readonly conversionError = new EventEmitter<unknown>();
  @Output() readonly filesSelected = new EventEmitter<File[]>();

  @ViewChild("converter") private converter?: ElementRef<ImageConverterElement>;

  convert(): Promise<ConversionResult[]> {
    return this.converter?.nativeElement.convert() ?? Promise.resolve([]);
  }

  reset(): void {
    this.converter?.nativeElement.reset();
  }
}
