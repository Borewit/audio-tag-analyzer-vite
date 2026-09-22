import type { ICommonTagsResult } from "music-metadata";

const entities: Record<string, string> = {
  recordingid: "recording",
  trackid: "track",
  albumid: "release",
  artistid: "artist",
  albumartistid: "artist",
  releasegroupid: "release-group",
  workid: "work",
  discid: "cdtoc",
};

// Common tag names follow Picard's internal names. Native TRACKID tags
// contain a recording ID; RELEASETRACKID contains the release track ID.
export function musicBrainzUrl(
  name: string,
  value: unknown,
  native = false,
): string | undefined {
  if (typeof value !== "string") return;
  const key = native
    ? name
        .replace(/^(TXXX:|----:com\.apple\.iTunes:)/i, "")
        .replace(/[ _/]/g, "")
        .toLowerCase()
    : name.replace(/^musicbrainz_/, "musicbrainz");
  if (!key.startsWith("musicbrainz")) return;
  let field = key.slice("musicbrainz".length);
  if (native && field === "trackid") field = "recordingid";
  else if (native && field === "releasetrackid") field = "trackid";
  const entity = entities[field];
  const id = value.trim();
  const valid =
    field === "discid"
      ? /^[A-Za-z0-9._]{27}-$/.test(id)
      : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        );
  if (typeof entity === "string" && valid)
    return `https://musicbrainz.org/${entity}/${id}`;
}

export function commonMusicBrainzUrl(
  name: string,
  common: ICommonTagsResult,
  index = 0,
): string | undefined {
  if (name === "title") {
    return (
      musicBrainzUrl(
        "musicbrainz_recordingid",
        common.musicbrainz_recordingid,
      ) ?? musicBrainzUrl("musicbrainz_trackid", common.musicbrainz_trackid)
    );
  }
  if (name === "album") {
    return (
      musicBrainzUrl("musicbrainz_albumid", common.musicbrainz_albumid) ??
      musicBrainzUrl(
        "musicbrainz_releasegroupid",
        common.musicbrainz_releasegroupid,
      )
    );
  }
  if (name === "work")
    return musicBrainzUrl("musicbrainz_workid", common.musicbrainz_workid);
  const albumArtist = name === "albumartist" || name === "albumartists";
  if (!albumArtist && name !== "artist" && name !== "artists") return;
  const ids = albumArtist
    ? common.musicbrainz_albumartistid
    : common.musicbrainz_artistid;
  const names =
    common[name as "artist" | "artists" | "albumartist" | "albumartists"];
  // Only pair names and IDs when they align. A combined artist credit can
  // represent several artists and must not link to just the first one.
  if (!ids || ids.length !== (Array.isArray(names) ? names.length : 1)) return;
  return musicBrainzUrl("musicbrainz_artistid", ids[index]);
}
