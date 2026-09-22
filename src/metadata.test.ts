import { describe, expect, it } from "vitest";
import { bytes, display, duration, json, label } from "./metadata";
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
});
