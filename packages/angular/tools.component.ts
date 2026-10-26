import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from "@angular/core";
import {
  defineBackgroundRemover,
  defineColorPicker,
  defineImageCompressor,
  defineImageCropper,
  defineImageResizer,
  defineImageToBase64,
  defineSocialResizer,
  defineStudio,
  defineYouTubeThumbnail,
  type BackgroundRemovalResult,
  type Base64Result,
  type ColorInfo,
  type ColorPickerResult,
  type CompressionResult,
  type FitMode,
  type ImageResult,
  type OutputFormat,
  type Position,
  type Rect,
  type Segmenter,
  type SocialResizeResult,
  type StudioTool,
} from "pixelshift-web-core";
import { PixelshiftToolHost } from "./tool-host.js";

// Each component's host is the custom element itself, which renders into its
// own shadow root, so the Angular templates are empty. The decorator
// metadata is spelled out per component because the AOT compiler only reads
// literal objects.

@Component({
  selector: "pixelshift-image-compressor",
  standalone: true,
  template: "",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageCompressorComponent extends PixelshiftToolHost<CompressionResult> {
  @Input() quality?: number;
  @Input() format?: OutputFormat;
  /** Upper bound in bytes. */
  @Input() targetSize?: number;
  @Input() maxWidth?: number;
  @Input() multiple?: boolean;

  protected define(): void {
    defineImageCompressor();
  }
}

@Component({
  selector: "pixelshift-image-resizer",
  standalone: true,
  template: "",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageResizerComponent extends PixelshiftToolHost<ImageResult> {
  @Input() width?: number;
  @Input() height?: number;
  @Input() percent?: number;
  @Input() unit?: "px" | "percent";
  @Input() keepAspectRatio?: boolean;
  @Input() fit?: FitMode;
  @Input() format?: OutputFormat;
  @Input() quality?: number;
  @Input() noUpscale?: boolean;
  @Input() multiple?: boolean;

  protected define(): void {
    defineImageResizer();
  }
}

@Component({
  selector: "pixelshift-image-cropper",
  standalone: true,
  template: "",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageCropperComponent extends PixelshiftToolHost<ImageResult> {
  @Input() aspectRatio?: string;
  @Input() format?: OutputFormat;
  @Input() quality?: number;

  @Output() readonly cropChange = new EventEmitter<Rect>();

  protected define(): void {
    defineImageCropper();
  }

  @HostListener("crop-change", ["$event"])
  protected onCropChange(event: Event): void {
    this.cropChange.emit((event as CustomEvent<Rect>).detail);
  }
}

@Component({
  selector: "pixelshift-color-picker",
  standalone: true,
  template: "",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPickerComponent extends PixelshiftToolHost<ColorPickerResult> {
  @Input() count?: number;
  @Input() colorFormat?: "hex" | "rgb" | "hsl";

  @Output() readonly colorPick = new EventEmitter<ColorInfo>();

  protected define(): void {
    defineColorPicker();
  }

  @HostListener("color-pick", ["$event"])
  protected onColorPick(event: Event): void {
    this.colorPick.emit((event as CustomEvent<ColorInfo>).detail);
  }
}

@Component({
  selector: "pixelshift-image-to-base64",
  standalone: true,
  template: "",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageToBase64Component extends PixelshiftToolHost<Base64Result> {
  @Input() snippet?:
    | "dataUrl"
    | "base64"
    | "html"
    | "css"
    | "markdown"
    | "json";
  @Input() alt?: string;

  protected define(): void {
    defineImageToBase64();
  }
}

@Component({
  selector: "pixelshift-social-resizer",
  standalone: true,
  template: "",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialResizerComponent extends PixelshiftToolHost<SocialResizeResult> {
  @Input() preset?: string;
  @Input() platforms?: string;
  @Input() fit?: "cover" | "contain";
  @Input() position?: Position;
  @Input() background?: string;
  @Input() format?: OutputFormat;
  @Input() quality?: number;
  @Input() multiple?: boolean;

  protected define(): void {
    defineSocialResizer();
  }
}

@Component({
  selector: "pixelshift-youtube-thumbnail",
  standalone: true,
  template: "",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YouTubeThumbnailComponent extends PixelshiftToolHost<SocialResizeResult> {
  @Input() fit?: "cover" | "contain";
  @Input() position?: Position;
  @Input() background?: string;
  @Input() format?: OutputFormat;
  @Input() quality?: number;
  @Input() multiple?: boolean;

  protected define(): void {
    defineYouTubeThumbnail();
  }
}

@Component({
  selector: "pixelshift-background-remover",
  standalone: true,
  template: "",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackgroundRemoverComponent extends PixelshiftToolHost<BackgroundRemovalResult> {
  @Input() tolerance?: number;
  @Input() feather?: number;
  @Input() contiguous?: boolean;
  @Input() color?: string;
  @Input() background?: string;
  @Input() format?: OutputFormat;
  @Input() multiple?: boolean;
  /** A custom foreground model that replaces color keying. */
  @Input() segmenter?: Segmenter;

  protected define(): void {
    defineBackgroundRemover();
  }
}

/** Every tool behind one tab bar. Tool events bubble through it. */
@Component({
  selector: "pixelshift-studio",
  standalone: true,
  template: "",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PixelshiftStudioComponent extends PixelshiftToolHost<unknown> {
  @Input() tools?: string;
  @Input() tool?: StudioTool;

  @Output() readonly toolChange = new EventEmitter<StudioTool>();

  protected define(): void {
    defineStudio();
  }

  @HostListener("tool-change", ["$event"])
  protected onToolChange(event: Event): void {
    this.toolChange.emit((event as CustomEvent<StudioTool>).detail);
  }

  /** The studio has no files of its own; these act on the active tool. */
  override process(): Promise<unknown[]> {
    return this.activeTool?.process() ?? Promise.resolve([]);
  }

  override reset(): void {
    this.activeTool?.reset();
  }

  override cancel(): void {
    this.activeTool?.cancel();
  }

  override loadFiles(files: FileList | readonly File[]): void {
    this.activeTool?.loadFiles(files);
  }

  private get activeTool() {
    return (
      this.host.nativeElement as unknown as {
        activeTool: PixelshiftToolHost<unknown>["element"] | null;
      }
    ).activeTool;
  }
}
