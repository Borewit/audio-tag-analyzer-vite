import { describe, expect, it } from "vitest";
import { TrackType } from "music-metadata";
import {
  bytes,
  display,
  duration,
  json,
  label,
  trackEntries,
  trackType,
} from "./metadata";
describe("human-readable metadata", () => {
  it("preserves zero and false values", () => {
    expect(display(false)).toBe("No");
    expect(display(0)).toBe("0");
    expect(display({ no: 0, of: 10 })).toBe("0 / 10");
  });
  it("formats units without losing original duration precision", () => {
    expect(display(44100, "sampleRate")).toBe("44.1 kHz");
    expect(display(320000, "bitrate")).toBe("320 kbps");
    expect(display(61.234, "duration")).toBe("1:01 (61.234 seconds)");
    expect(duration(3601)).toBe("1:00:01");
    expect(duration()).toBe("—");
    expect(bytes(0)).toBe("0 B");
  });
  it("handles unknown tags, nested values and repeated native values", () => {
    expect(label("futureCustomTag")).toBe("Future Custom Tag");
    expect(
      display([{ text: "hello", language: "eng" }, { text: "world" }]),
    ).toContain("Text: world");
    expect(display({ no: null, of: 12 })).toBe("— / 12");
  });
  it("exports complete binary data and supports big integers", () => {
    const exported = JSON.parse(
      json({ data: new Uint8Array([0, 255, 128]), count: 3n }),
    );
    expect(exported).toEqual({
      data: { type: "Uint8Array", data: [0, 255, 128] },
      count: "3",
    });
  });
  it("distinguishes complete media statistics from audio properties", () => {
    expect(label("containerDuration")).toBe("Media duration");
    expect(label("overallBitrate")).toBe("Overall file bitrate");
    expect(display(121.234, "containerDuration")).toBe(
      "2:01 (121.234 seconds)",
    );
    expect(display(1536000, "overallBitrate")).toBe("1536 kbps");
  });
  it("formats nested track properties with their units", () => {
    const entries = trackEntries({
      id: 0,
      type: TrackType.video,
      duration: 1.5,
      flagDefault: false,
      video: { frameRate: 29.97, pixelWidth: 1920, pixelHeight: 1080 },
    });
    expect(entries).toContainEqual(["type", "Video"]);
    expect(entries).toContainEqual(["id", 0]);
    expect(entries).toContainEqual(["flagDefault", false]);
    expect(display(entries.find(([key]) => key === "video")?.[1])).toBe(
      "Frame rate: 29.97 fps\nPixel width: 1920\nPixel height: 1080",
    );
    expect(
      display({
        samplingFrequency: 48000,
        outputSamplingFrequency: 96000,
        bitDepth: 24,
      }),
    ).toBe(
      "Sample rate: 48 kHz\nOutput sample rate: 96 kHz\nBit depth: 24-bit",
    );
    expect(trackType(TrackType.audio)).toBe("Audio");
    expect(trackType(TrackType.subtitle)).toBe("Subtitle");
    expect(trackType(TrackType.metadata)).toBe("Metadata");
    expect(trackType()).toBe("Unknown");
    expect(trackType(999)).toBe("Unknown (999)");
  });
});
