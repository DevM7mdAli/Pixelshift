import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  type OnChanges,
  type SimpleChanges,
} from "@angular/core";
import type { PixelshiftTool } from "pixelshift-web-core";

export interface ProcessErrorDetail {
  file: File;
  error: unknown;
}

/**
 * Base for components whose host element *is* the Pixelshift custom
 * element: the selector matches the element's tag, so Angular creates the
 * element itself and this class forwards inputs to its properties and its
 * DOM events to outputs. No wrapper node, and the same tag as in plain HTML.
 */
@Directive()
export abstract class PixelshiftToolHost<TResult> implements OnChanges {
  @Input() disabled?: boolean;
  @Input() isDarkMode?: boolean;
  @Input() bare?: boolean;
  @Input() auto?: boolean;
  @Input() heading?: string;
  @Input() description?: string;

  @Output() readonly filesSelected = new EventEmitter<File[]>();
  @Output() readonly processStart = new EventEmitter<File[]>();
  @Output() readonly processComplete = new EventEmitter<TResult[]>();
  @Output() readonly processError = new EventEmitter<ProcessErrorDetail>();

  constructor(protected readonly host: ElementRef<HTMLElement>) {
    this.define();
  }

  /** Registers the custom element; runs before Angular sets any input. */
  protected abstract define(): void;

  /** The underlying custom element. */
  get element(): PixelshiftTool<TResult> {
    return this.host.nativeElement as unknown as PixelshiftTool<TResult>;
  }

  ngOnChanges(changes: SimpleChanges): void {
    const element = this.host.nativeElement as unknown as Record<
      string,
      unknown
    >;
    for (const [name, change] of Object.entries(changes)) {
      element[name] = change.currentValue;
    }
  }

  process(): Promise<TResult[]> {
    return this.element.process();
  }

  reset(): void {
    this.element.reset();
  }

  cancel(): void {
    this.element.cancel();
  }

  loadFiles(files: FileList | readonly File[]): void {
    this.element.loadFiles(files);
  }

  @HostListener("files-selected", ["$event"])
  protected onFilesSelected(event: Event): void {
    this.filesSelected.emit((event as CustomEvent<File[]>).detail);
  }

  @HostListener("process-start", ["$event"])
  protected onProcessStart(event: Event): void {
    this.processStart.emit((event as CustomEvent<File[]>).detail);
  }

  @HostListener("process-complete", ["$event"])
  protected onProcessComplete(event: Event): void {
    this.processComplete.emit((event as CustomEvent<TResult[]>).detail);
  }

  @HostListener("process-error", ["$event"])
  protected onProcessError(event: Event): void {
    this.processError.emit((event as CustomEvent<ProcessErrorDetail>).detail);
  }
}
