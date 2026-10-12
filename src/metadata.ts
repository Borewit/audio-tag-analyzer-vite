import { TrackType, type ITrackInfo } from "music-metadata";

export const labels: Record<string, string> = {
  albumartist: "Album artist",
  artistsort: "Artist sort name",
  albumartistsort: "Album artist sort name",
  albumsort: "Album sort title",
  titlesort: "Title sort name",
  track: "Track number",
  disk: "Disc number",
  bpm: "Tempo (BPM)",
  isrc: "ISRC",
  asin: "ASIN",
  catalognumber: "Catalog number",
  originaldate: "Original release date",
  originalyear: "Original release year",
  date: "Release date",
  encodedby: "Encoded by",
  encodersettings: "Encoder settings",
  codecProfile: "Codec profile",
  numberOfChannels: "Channels",
  bitsPerSample: "Bit depth",
  sampleRate: "Sample rate",
  tagTypes: "Tag formats",
  audioMD5: "Audio MD5",
  numberOfSamples: "Sample count",
  containerDuration: "Media duration",
  overallBitrate: "Overall file bitrate",
  hasAudio: "Contains audio",
  hasVideo: "Contains video",
  codecId: "Codec ID",
  samplingFrequency: "Sample rate",
  outputSamplingFrequency: "Output sample rate",
  bitDepth: "Bit depth",
  frameRate: "Frame rate",
  pixelWidth: "Pixel width",
  pixelHeight: "Pixel height",
  flagEnabled: "Enabled",
  flagDefault: "Default track",
  flagForced: "Forced track",
  replaygain_track_gain: "ReplayGain track gain",
  replaygain_album_gain: "ReplayGain album gain",
  musicbrainz_recordingid: "MusicBrainz recording ID",
  musicbrainz_trackid: "MusicBrainz track ID",
  musicbrainz_albumid: "MusicBrainz release ID",
  musicbrainz_artistid: "MusicBrainz artist ID",
  musicbrainz_albumartistid: "MusicBrainz album artist ID",
  musicbrainz_releasegroupid: "MusicBrainz release group ID",
  musicbrainz_workid: "MusicBrainz work ID",
  musicbrainz_discid: "MusicBrainz disc ID",
  picture: "Embedded artwork",
};
export function trackType(type?: ITrackInfo["type"]): string {
  const name = Object.entries(TrackType).find(
    ([, value]) => value === type,
  )?.[0];
  return name
    ? label(name)
    : type === undefined
      ? "Unknown"
      : `Unknown (${type})`;
}
export function trackEntries(track: ITrackInfo): [string, unknown][] {
  return Object.entries(track).map(([key, value]) => [
    key,
    key === "type" ? trackType(track.type) : value,
  ]);
}
export function label(key: string): string {
  return (
    labels[key] ??
    key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_:]/g, " ")
      .replace(/^./, (c) => c.toUpperCase())
  );
}
export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), 3);
  return `${(n / 1024 ** i).toFixed(1)} ${["B", "KB", "MB", "GB"][i]}`;
}
export function duration(n?: number): string {
  if (n === undefined || !Number.isFinite(n)) return "—";
  const s = Math.floor(n);
  return s >= 3600
    ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
    : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function display(value: unknown, key = ""): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Uint8Array)
    return `${bytes(value.byteLength)} of binary data`;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (key === "duration" || key === "containerDuration")
      return `${duration(value)} (${Number(value.toFixed(3))} seconds)`;
    if (key === "bitrate" || key === "overallBitrate")
      return `${Math.round(value / 1000)} kbps`;
    if (
      ["sampleRate", "samplingFrequency", "outputSamplingFrequency"].includes(
        key,
      )
    )
      return `${value / 1000} kHz`;
    if (key === "bitsPerSample" || key === "bitDepth") return `${value}-bit`;
    if (key === "frameRate") return `${value} fps`;
    return String(value);
  }
  if (Array.isArray(value))
    return value.map((v) => display(v, key)).join(" · ");
  if (typeof value === "object") {
    if ("no" in value && "of" in value)
      return `${value.no ?? "—"}${value.of == null ? "" : ` / ${value.of}`}`;
    return Object.entries(value)
      .map(([k, v]) => `${label(k)}: ${display(v, k)}`)
      .join("\n");
  }
  return String(value);
}
export function json(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, v) =>
      v instanceof Uint8Array
        ? { type: "Uint8Array", data: Array.from(v) }
        : typeof v === "bigint"
          ? String(v)
          : v,
    2,
  );
}
