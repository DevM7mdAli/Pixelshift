import { crc32 } from "./png.js";

export interface ZipEntry {
  name: string;
  data: Blob | Uint8Array;
  lastModified?: number;
}

/**
 * Bundles files into an uncompressed ZIP archive — images are already
 * compressed, so deflating them again would only cost time. Duplicate names
 * get a numeric suffix instead of overwriting each other.
 *
 * ```ts
 * const zip = await createZip(results.map(({ file }) => file));
 * ```
 */
export async function createZip(
  entries: readonly (ZipEntry | File)[],
): Promise<Blob> {
  const encoder = new TextEncoder();
  const used = new Set<string>();
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const data =
      entry instanceof Blob
        ? new Uint8Array(await entry.arrayBuffer())
        : entry.data instanceof Blob
          ? new Uint8Array(await entry.data.arrayBuffer())
          : entry.data;
    const name = encoder.encode(uniqueName(entry.name, used));
    const [time, date] = dosDateTime(entry.lastModified ?? Date.now());
    const checksum = crc32(data);

    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true); // UTF-8 file names
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);

    parts.push(local, data);
    directory.push(central);
    offset += local.length + data.length;
  }

  const directorySize = directory.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, directorySize, true);
  endView.setUint32(16, offset, true);

  return new Blob([...parts, ...directory, end] as BlobPart[], {
    type: "application/zip",
  });
}

function uniqueName(name: string, used: Set<string>): string {
  let candidate = name || "file";
  const match = /^(.*?)(\.[^.]*)?$/.exec(candidate)!;
  for (let copy = 2; used.has(candidate); copy += 1) {
    candidate = `${match[1]} (${copy})${match[2] ?? ""}`;
  }
  used.add(candidate);
  return candidate;
}

function dosDateTime(timestamp: number): [number, number] {
  const date = new Date(timestamp);
  const year = Math.max(1980, date.getFullYear());
  return [
    (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  ];
}
