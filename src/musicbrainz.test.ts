import { describe, expect, it } from "vitest";
import type { ICommonTagsResult } from "music-metadata";
import { commonMusicBrainzUrl, musicBrainzUrl } from "./musicbrainz";

const first = "3fe817fc-966e-4ece-b00a-76be43e7e73c";
const second = "984f8239-8fe1-4683-9c54-10ffb14439e9";
const common = (tags: Partial<ICommonTagsResult>): ICommonTagsResult => ({
  track: { no: null, of: null },
  disk: { no: null, of: null },
  movementIndex: { no: null, of: null },
  ...tags,
});

describe("MusicBrainz links", () => {
  it.each([
    ["recordingid", "recording"],
    ["trackid", "track"],
    ["albumid", "release"],
    ["artistid", "artist"],
    ["albumartistid", "artist"],
    ["releasegroupid", "release-group"],
    ["workid", "work"],
  ])("links %s to the correct entity", (field, entity) => {
    expect(musicBrainzUrl(`musicbrainz_${field}`, first)).toBe(
      `https://musicbrainz.org/${entity}/${first}`,
    );
  });

  it.each([
    "MUSICBRAINZ_TRACKID",
    "TXXX:MusicBrainz Track Id",
    "----:com.apple.iTunes:MusicBrainz Track Id",
    "MusicBrainz/Track Id",
  ])("treats native %s as a recording ID", (field) => {
    expect(musicBrainzUrl(field, first, true)).toBe(
      `https://musicbrainz.org/recording/${first}`,
    );
    expect(
      musicBrainzUrl(field.replace(/track/i, "ReleaseTrack"), first, true),
    ).toBe(`https://musicbrainz.org/track/${first}`);
  });

  it("supports disc IDs and leaves unsupported or malformed IDs unlinked", () => {
    const discId = "_zmon3FigxHkSgwZkJO7eYLDV64-";
    expect(musicBrainzUrl("musicbrainz_discid", discId)).toBe(
      `https://musicbrainz.org/cdtoc/${discId}`,
    );
    for (const value of [
      "",
      "not-an-id",
      "javascript:alert(1)",
      `${first}/edit`,
      null,
      42,
    ]) {
      expect(musicBrainzUrl("musicbrainz_artistid", value)).toBeUndefined();
    }
    expect(musicBrainzUrl("musicbrainz_trmid", first)).toBeUndefined();
    expect(musicBrainzUrl("other_artistid", first)).toBeUndefined();
  });

  it("pairs multiple artists by index only when the counts agree", () => {
    const tags = common({
      artists: ["Beth Hart", "Joe Bonamassa"],
      artist: "Beth Hart & Joe Bonamassa",
      musicbrainz_artistid: [first, second],
    });
    expect(commonMusicBrainzUrl("artists", tags, 0)).toBe(
      `https://musicbrainz.org/artist/${first}`,
    );
    expect(commonMusicBrainzUrl("artists", tags, 1)).toBe(
      `https://musicbrainz.org/artist/${second}`,
    );
    expect(commonMusicBrainzUrl("artist", tags)).toBeUndefined();
    expect(
      commonMusicBrainzUrl("artists", {
        ...tags,
        musicbrainz_artistid: [first],
      }),
    ).toBeUndefined();
  });

  it("uses album artist IDs independently of track artist IDs", () => {
    const tags = common({
      artist: "Beth Hart",
      albumartist: "Joe Bonamassa",
      musicbrainz_artistid: [first],
      musicbrainz_albumartistid: [second],
    });
    expect(commonMusicBrainzUrl("artist", tags)).toBe(
      `https://musicbrainz.org/artist/${first}`,
    );
    expect(commonMusicBrainzUrl("albumartist", tags)).toBe(
      `https://musicbrainz.org/artist/${second}`,
    );
  });

  it("prefers recording and release IDs, with track and release-group fallbacks", () => {
    const fallback = common({
      musicbrainz_trackid: first,
      musicbrainz_releasegroupid: second,
    });
    expect(commonMusicBrainzUrl("title", fallback)).toBe(
      `https://musicbrainz.org/track/${first}`,
    );
    expect(commonMusicBrainzUrl("album", fallback)).toBe(
      `https://musicbrainz.org/release-group/${second}`,
    );
    const primary = {
      ...fallback,
      musicbrainz_recordingid: second,
      musicbrainz_albumid: first,
    };
    expect(commonMusicBrainzUrl("title", primary)).toBe(
      `https://musicbrainz.org/recording/${second}`,
    );
    expect(commonMusicBrainzUrl("album", primary)).toBe(
      `https://musicbrainz.org/release/${first}`,
    );
    expect(
      commonMusicBrainzUrl("artist", common({ artist: "No ID" })),
    ).toBeUndefined();
  });
});
