import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.APP_URL || "http://localhost:5173");
await page.screenshot({
  path: "/tmp/audio-analyzer-desktop.png",
  fullPage: true,
});
const sampleDir =
  process.env.SAMPLE_DIR ||
  fileURLToPath(new URL("../../music-metadata/test/samples", import.meta.url));
const files = [
  "id3v2.4.mp3",
  "MusicBrainz-Picard-tags.flac",
  "MusicBrainz - Beth Hart - Sinner's Prayer.m4a",
  "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav",
];
await page
  .locator("input[type=file]")
  .setInputFiles(files.map((f) => `${sampleDir}/${f}`));
await page
  .locator("audio")
  .waitFor()
  .catch(async (error) => {
    console.error(await page.locator("body").innerText());
    throw error;
  });
await page.waitForFunction(
  () => document.querySelectorAll(".file-check").length === 4,
);
assert.equal(await page.locator(".file-item").count(), 4);
for (let i = 0; i < 4; i++) {
  await page.locator(".file-select").nth(i).click();
  await page.locator("audio").waitFor();
  await page.getByRole("button", { name: "Native tags", exact: true }).click();
  assert.ok(await page.locator(".native-group").count());
  await page.getByRole("button", { name: "Common tags", exact: true }).click();
  if (i === 3) {
    const row = (name) =>
      page
        .locator(".tag-row")
        .filter({
          has: page.locator("code", { hasText: new RegExp(`^${name}$`) }),
        });
    const recordingUrl =
      "https://musicbrainz.org/recording/f151cb94-c909-46a8-ad99-fb77391abfb8";
    const recordingLink = row("musicbrainz_recordingid").getByRole("link");
    assert.equal(await recordingLink.getAttribute("href"), recordingUrl);
    assert.equal(await recordingLink.innerText(), recordingUrl);
    assert.equal(await recordingLink.getAttribute("target"), "_blank");
    assert.equal(
      await row("title").getByRole("link").getAttribute("href"),
      recordingUrl,
    );
    const artistLinks = row("artists").getByRole("link");
    assert.deepEqual(await artistLinks.allTextContents(), [
      "Beth Hart",
      "Joe Bonamassa",
    ]);
    assert.equal(
      await artistLinks.nth(1).getAttribute("href"),
      "https://musicbrainz.org/artist/984f8239-8fe1-4683-9c54-10ffb14439e9",
    );
    assert.equal(await row("artist").getByRole("link").count(), 0);
    await page
      .getByRole("button", { name: "Native tags", exact: true })
      .click();
    assert.ok(
      await page.locator(`.native-group a[href="${recordingUrl}"]`).count(),
    );
    await page
      .getByRole("button", { name: "Common tags", exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.setViewportSize({ width: 1440, height: 1100 });
  }
  await page
    .getByRole("textbox", { name: "Search tags" })
    .fill("impossible-tag-search");
  await page.getByText("No tags match your search.").waitFor();
  await page.getByRole("textbox", { name: "Search tags" }).fill("");
  await page
    .getByRole("button", { name: "Audio details", exact: true })
    .click();
  assert.ok((await page.locator(".tag-row").count()) > 3);
}
await page.locator(".file-select").first().click();
await page.getByRole("button", { name: "Overview", exact: true }).click();
await page.screenshot({
  path: "/tmp/audio-analyzer-loaded.png",
  fullPage: true,
});
const downloadPromise = page.waitForEvent("download");
await page
  .getByRole("button", { name: "Export metadata as JSON", exact: true })
  .click();
const download = await downloadPromise;
assert.ok(download.suggestedFilename().endsWith(".metadata.json"));
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: "/tmp/audio-analyzer-mobile.png",
  fullPage: true,
});
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.locator("input[type=file]").setInputFiles({
  name: "broken.txt",
  mimeType: "text/plain",
  buffer: Buffer.from("not an audio file"),
});
await page
  .getByRole("heading", { name: "We couldn’t read this file" })
  .waitFor();
await page
  .getByRole("button", { name: "Remove broken.txt", exact: true })
  .click();
assert.equal(await page.locator(".file-item").count(), 4);
await page.getByRole("button", { name: "Clear all", exact: true }).click();
await page
  .getByRole("heading", { name: "Meet your music’s metadata." })
  .waitFor();
assert.deepEqual(errors, []);
// A generated PCM WAV verifies actual playback without copyrighted fixtures.
const wav = Buffer.alloc(44 + 16000 * 2);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24);
wav.writeUInt32LE(16000, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(wav.length - 44, 40);
for (let i = 0; i < 16000; i++)
  wav.writeInt16LE(
    Math.round(Math.sin((i * 2 * Math.PI * 220) / 8000) * 500),
    44 + i * 2,
  );
await page
  .locator("input[type=file]")
  .setInputFiles({ name: "playback.wav", mimeType: "audio/wav", buffer: wav });
await page.locator("audio").waitFor();
await page.locator("audio").evaluate(async (audio) => {
  audio.muted = true;
  await audio.play();
});
await page.waitForFunction(
  () => document.querySelector("audio").currentTime > 0,
);
await page.locator("audio").evaluate((audio) => audio.pause());
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "Browser checks passed: four audio formats, independent results, tabs, search, JSON download, mobile overflow, malformed file, removal, and clear all.",
);
