import { useEffect, useRef, useState } from "react";
import type {
  IAudioMetadata,
  ICommonTagsResult,
  IPicture,
} from "music-metadata";
import {
  AudioLines,
  ArrowUpRight,
  Upload,
  Plus,
  X,
  FileAudio,
  ShieldCheck,
  Search,
  Download,
  Music2,
  Tags,
  SlidersHorizontal,
  Image,
  Code2,
  Check,
  AlertTriangle,
  Headphones,
  Layers,
} from "lucide-react";
import { bytes, display, duration, json, label } from "./metadata";
import { commonMusicBrainzUrl, musicBrainzUrl } from "./musicbrainz";

type Entry = {
  id: string;
  file: File;
  metadata?: IAudioMetadata;
  error?: string;
};
type Section = "overview" | "common" | "format" | "artwork" | "native" | "json";
const sections = [
  { id: "overview", title: "Overview", icon: Layers },
  { id: "common", title: "Common tags", icon: Tags },
  { id: "format", title: "Audio details", icon: SlidersHorizontal },
  { id: "artwork", title: "Artwork", icon: Image },
  { id: "native", title: "Native tags", icon: Code2 },
  { id: "json", title: "Raw JSON", icon: Code2 },
] as const;
function useObjectUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
function Artwork({
  picture,
  large = false,
}: {
  picture?: IPicture;
  large?: boolean;
}) {
  const [blob, setBlob] = useState<Blob>();
  useEffect(() => {
    setBlob(
      picture
        ? new Blob([new Uint8Array(picture.data)], { type: picture.format })
        : undefined,
    );
  }, [picture]);
  const url = useObjectUrl(blob);
  return (
    <div className={`cover ${large ? "large" : ""}`}>
      {url ? (
        <img src={url} alt={picture?.description || "Embedded album artwork"} />
      ) : (
        <Music2 size={large ? 44 : 22} strokeWidth={1.4} />
      )}
    </div>
  );
}
function Player({ file }: { file: File }) {
  const url = useObjectUrl(file);
  const [failed, setFailed] = useState(false);
  return (
    <div className="player">
      <div className="player-label">
        <Headphones size={17} />
        <span>Listen to this file</span>
        <small>Local playback</small>
      </div>
      <audio
        controls
        preload="metadata"
        src={url}
        onError={() => setFailed(true)}
        aria-label={`Play ${file.name}`}
      />
      {failed && (
        <p className="muted">
          Your browser cannot play this codec. You can still explore its
          metadata.
        </p>
      )}
    </div>
  );
}
function Value({
  value,
  name,
  common,
  native = false,
  index = 0,
}: {
  value: unknown;
  name: string;
  common?: ICommonTagsResult;
  native?: boolean;
  index?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (value instanceof Uint8Array)
    return (
      <details onToggle={(e) => setExpanded(e.currentTarget.open)}>
        <summary>{bytes(value.length)} of binary data</summary>
        <pre>
          {expanded
            ? Array.from(value, (v) => v.toString(16).padStart(2, "0")).join(
                " ",
              )
            : null}
        </pre>
      </details>
    );
  if (Array.isArray(value))
    return (
      <div className="values">
        {value.map((v, i) => (
          <Value
            key={i}
            value={v}
            name={name}
            common={common}
            native={native}
            index={i}
          />
        ))}
      </div>
    );
  if (value && typeof value === "object" && !("no" in value && "of" in value))
    return (
      <div className="nested">
        {Object.entries(value).map(([key, v]) => (
          <div key={key}>
            <span className="muted">{label(key)}: </span>
            {native &&
            name === "UFID" &&
            key === "identifier" &&
            "owner_identifier" in value &&
            (value.owner_identifier === "http://musicbrainz.org" ||
              value.owner_identifier === "https://musicbrainz.org") &&
            v instanceof Uint8Array &&
            musicBrainzUrl(
              "musicbrainz_recordingid",
              new TextDecoder().decode(v),
            ) ? (
              <Value
                value={new TextDecoder().decode(v)}
                name="musicbrainz_recordingid"
              />
            ) : (
              <Value value={v} name={key} />
            )}
          </div>
        ))}
      </div>
    );
  const idUrl = musicBrainzUrl(name, value, native);
  const url = idUrl ?? (common && commonMusicBrainzUrl(name, common, index));
  return (
    <span>
      {url ? (
        <a
          className="musicbrainz-link"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="View on MusicBrainz (opens in a new tab)"
        >
          {idUrl ?? display(value, name)}
        </a>
      ) : (
        display(value, name)
      )}
    </span>
  );
}
function TagTable({
  entries,
  query = "",
  native = false,
  common,
}: {
  entries: [string, unknown][];
  query?: string;
  native?: boolean;
  common?: ICommonTagsResult;
}) {
  const filtered = entries.filter(([key, value]) =>
    `${key} ${label(key)} ${display(value, key)}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return filtered.length ? (
    <div className="tag-table">
      {filtered.map(([key, value], index) => (
        <div className="tag-row" key={`${key}-${index}`}>
          <div>
            <span className="tag-label">{native ? key : label(key)}</span>
            {!native && <code>{key}</code>}
          </div>
          <div className="tag-value">
            <Value value={value} name={key} common={common} native={native} />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="empty-inline">
      {query ? "No tags match your search." : "No tags found in this section."}
    </p>
  );
}
function Detail({ entry }: { entry: Entry }) {
  const [section, setSection] = useState<Section>("overview");
  const [query, setQuery] = useState("");
  const metadata = entry.metadata;
  if (entry.error)
    return (
      <div className="error-state">
        <AlertTriangle size={36} />
        <h2>We couldn’t read this file</h2>
        <p>{entry.file.name}</p>
        <p>{entry.error}</p>
        <small>
          Try another audio file. A damaged or unsupported file may not contain
          readable metadata.
        </small>
      </div>
    );
  if (!metadata)
    return (
      <div className="empty-state" role="status">
        <div className="spinner" />
        <h2>Reading your audio file…</h2>
        <p>Extracting tags, artwork, and audio details locally.</p>
      </div>
    );
  const { common, format, native, quality } = metadata;
  const commonEntries = Object.entries(common);
  const nativeCount = Object.values(native).reduce(
    (total, tags) => total + tags.length,
    0,
  );
  function download() {
    const url = URL.createObjectURL(
      new Blob([json(metadata)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.file.name}.metadata.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="track-header">
        <Artwork picture={common.picture?.[0]} large />
        <div className="track-heading">
          <div className="eyebrow">YOUR AUDIO, DECODED</div>
          <h2>
            {common.title ? (
              <Value value={common.title} name="title" common={common} />
            ) : (
              entry.file.name
            )}
          </h2>
          <p>
            {common.artist ? (
              <Value value={common.artist} name="artist" common={common} />
            ) : (
              "Unknown artist"
            )}
            <span className="dot">·</span>
            {common.album ? (
              <Value value={common.album} name="album" common={common} />
            ) : (
              "Unknown album"
            )}
          </p>
          <div className="chips">
            <span>{format.container || "Audio"}</span>
            {format.lossless !== undefined && (
              <span>{format.lossless ? "Lossless" : "Lossy"}</span>
            )}
            <span>{bytes(entry.file.size)}</span>
          </div>
        </div>
        <button
          className="icon-button export"
          title="Export metadata as JSON"
          aria-label="Export metadata as JSON"
          onClick={download}
        >
          <Download size={19} />
        </button>
      </div>
      <Player key={entry.id} file={entry.file} />
      <nav className="tabs" aria-label="Metadata sections">
        {sections.map(({ id, title, icon: Icon }) => (
          <button
            key={id}
            aria-current={section === id ? "page" : undefined}
            onClick={() => {
              setSection(id);
              setQuery("");
            }}
          >
            <Icon size={16} />
            {title}
            {id === "artwork" && <small>{common.picture?.length || 0}</small>}
          </button>
        ))}
      </nav>
      <div className="section-content">
        <div className="section-heading">
          <div>
            <h3>{sections.find((s) => s.id === section)?.title}</h3>
            <p>
              {section === "overview"
                ? "A closer look at what’s inside your file."
                : section === "common"
                  ? "Normalized tags, across every audio format."
                  : section === "native"
                    ? "Original tags, exactly as stored in the file."
                    : section === "format"
                      ? "Technical properties of your audio."
                      : section === "artwork"
                        ? "Images embedded in your audio file."
                        : "The complete music-metadata result."}
            </p>
          </div>
          {["common", "format", "native"].includes(section) && (
            <label className="search">
              <Search size={16} />
              <input
                aria-label="Search tags"
                placeholder="Search tags…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          )}
        </div>
        {section === "overview" && (
          <>
            <div className="stats">
              {[
                ["Duration", duration(format.duration)],
                [
                  "Bitrate",
                  format.bitrate
                    ? `${Math.round(format.bitrate / 1000)} kbps`
                    : "—",
                ],
                [
                  "Sample rate",
                  format.sampleRate ? `${format.sampleRate / 1000} kHz` : "—",
                ],
                [
                  "Channels",
                  format.numberOfChannels === 2
                    ? "Stereo"
                    : format.numberOfChannels === 1
                      ? "Mono"
                      : (format.numberOfChannels ?? "—"),
                ],
              ].map(([key, value]) => (
                <div key={key}>
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="subheading">
              <h4>Track information</h4>
              <button
                className="text-button"
                onClick={() => setSection("common")}
              >
                View all tags <ArrowUpRight size={14} />
              </button>
            </div>
            <TagTable
              common={common}
              entries={commonEntries.filter(([key]) =>
                [
                  "title",
                  "artist",
                  "album",
                  "albumartist",
                  "year",
                  "date",
                  "genre",
                  "track",
                  "disk",
                  "composer",
                ].includes(key),
              )}
            />
            <div
              className={`quality ${quality.warnings.length ? "warning" : ""}`}
            >
              {quality.warnings.length ? (
                <AlertTriangle size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}
              <div>
                <strong>
                  {quality.warnings.length
                    ? `${quality.warnings.length} parser warning${quality.warnings.length === 1 ? "" : "s"}`
                    : "Analysis complete"}
                </strong>
                <p>
                  {quality.warnings.length
                    ? "The parser reported the following issues."
                    : `${commonEntries.length} common properties and ${nativeCount} native tags extracted. No parser warnings.`}
                </p>
                {quality.warnings.length > 0 && (
                  <details className="warning-details">
                    <summary>Show all warnings</summary>
                    {quality.warnings.map((w, i) => (
                      <p key={i}>{w.message}</p>
                    ))}
                  </details>
                )}
              </div>
            </div>
            <details className="file-details">
              <summary>File information</summary>
              <TagTable
                entries={[
                  ["name", entry.file.name],
                  ["size", bytes(entry.file.size)],
                  ["type", entry.file.type || "Not supplied"],
                  [
                    "lastModified",
                    new Date(entry.file.lastModified).toLocaleString(),
                  ],
                ]}
              />
            </details>
          </>
        )}
        {section === "common" && (
          <TagTable entries={commonEntries} query={query} common={common} />
        )}
        {section === "format" && (
          <TagTable entries={Object.entries(format)} query={query} />
        )}
        {section === "native" &&
          (Object.keys(native).length ? (
            Object.entries(native).map(([type, tags]) => (
              <section className="native-group" key={type}>
                <h4>
                  {type}
                  <span className="count">{tags.length}</span>
                </h4>
                <TagTable
                  entries={tags.map((t) => [t.id, t.value])}
                  query={query}
                  native
                />
              </section>
            ))
          ) : (
            <p className="empty-inline">This file contains no native tags.</p>
          ))}
        {section === "artwork" &&
          (common.picture?.length ? (
            <div className="artwork-grid">
              {common.picture.map((picture, i) => (
                <div className="artwork-card" key={i}>
                  <Artwork picture={picture} large />
                  <h4>{picture.type || `Artwork ${i + 1}`}</h4>
                  <p>{picture.description || "No description"}</p>
                  <small>
                    {picture.format} · {bytes(picture.data.length)}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-inline">No embedded artwork was found.</p>
          ))}
        {section === "json" && (
          <>
            <p className="muted">
              Binary data is included as byte arrays in the export.
            </p>
            <button className="secondary" onClick={download}>
              <Download size={16} />
              Download complete JSON
            </button>
            <pre className="json-view">
              {JSON.stringify(
                metadata,
                (_key, v) =>
                  v instanceof Uint8Array
                    ? `[${v.length} bytes — included in export]`
                    : typeof v === "bigint"
                      ? String(v)
                      : v,
                2,
              )}
            </pre>
          </>
        )}
      </div>
    </>
  );
}
export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const workers = useRef(new Map<string, Worker>());
  const queue = useRef<Entry[]>([]);
  useEffect(
    () => () => {
      workers.current.forEach((w) => w.terminate());
      workers.current.clear();
      queue.current = [];
    },
    [],
  );
  function addFiles(files: FileList | File[]) {
    const added = Array.from(files).map((file) => ({
      file,
      id: crypto.randomUUID(),
    }));
    if (!added.length) return;
    setEntries((previous) => [...previous, ...added]);
    setSelected(added[0].id);
    queue.current.push(...added);
    processQueue();
  }
  function processQueue() {
    while (workers.current.size < 2 && queue.current.length) {
      const entry = queue.current.shift()!;
      const worker = new Worker(
        new URL("./parser.worker.ts", import.meta.url),
        { type: "module" },
      );
      workers.current.set(entry.id, worker);
      const finish = (result: {
        metadata?: IAudioMetadata;
        error?: string;
      }) => {
        setEntries((previous) =>
          previous.map((e) => (e.id === entry.id ? { ...e, ...result } : e)),
        );
        worker.terminate();
        workers.current.delete(entry.id);
        processQueue();
      };
      worker.onmessage = (event) => finish(event.data);
      worker.onerror = () =>
        finish({
          error:
            "The audio parser could not finish. Please try this file again.",
        });
      worker.postMessage({ file: entry.file });
    }
  }
  function remove(id: string) {
    queue.current = queue.current.filter((entry) => entry.id !== id);
    workers.current.get(id)?.terminate();
    workers.current.delete(id);
    processQueue();
    setEntries((previous) => previous.filter((e) => e.id !== id));
    if (selected === id) setSelected(entries.find((e) => e.id !== id)?.id);
  }
  const active = entries.find((e) => e.id === selected);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to analyzer
      </a>
      <header className="site-header">
        <a className="brand" href="./">
          <span className="brand-icon">
            <AudioLines size={24} />
          </span>
          <span>
            Audio Tag Analyzer
            <span className="brand-sub">A little more behind every track.</span>
          </span>
        </a>
        <a
          className="source-link"
          href="https://github.com/Borewit/audio-tag-analyzer-vite"
          target="_blank"
          rel="noreferrer"
        >
          View on GitHub <ArrowUpRight size={16} />
        </a>
      </header>
      <main id="main-content">
        <section className="intro">
          <div className="eyebrow">
            <span className="tiny-dot" /> MADE FOR THE CURIOUS LISTENER
          </div>
          <h1>
            Every file has a story.
            <br />
            <span>Explore yours.</span>
          </h1>
          <p>
            Discover the tags, artwork, and technical details hidden in your
            audio.
            <br className="desktop-break" /> All in your browser. All on your
            device.
          </p>
        </section>
        <input
          className="visually-hidden"
          ref={input}
          type="file"
          multiple
          aria-label="Choose audio files"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <section
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <div className="upload-icon">
            <Upload size={25} strokeWidth={1.6} />
          </div>
          <div className="drop-copy">
            <h2>Drop your audio files here</h2>
            <p>MP3, FLAC, M4A, OGG, WAV, AIFF, and more</p>
          </div>
          <button className="primary" onClick={() => input.current?.click()}>
            <Plus size={18} />
            Choose files
          </button>
          <div className="privacy-note">
            <ShieldCheck size={14} />
            Your files never leave your device
          </div>
        </section>
        <div className="workspace">
          <aside className="file-panel">
            <div className="file-panel-heading">
              <h2>
                Your files <span className="count">{entries.length}</span>
              </h2>
              {entries.length > 0 && (
                <button
                  className="text-button"
                  onClick={() => {
                    workers.current.forEach((w) => w.terminate());
                    workers.current.clear();
                    queue.current = [];
                    setEntries([]);
                    setSelected(undefined);
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
            {entries.length ? (
              <div className="file-list">
                {entries.map((entry) => (
                  <div
                    className={`file-item ${entry.id === selected ? "selected" : ""}`}
                    key={entry.id}
                  >
                    <button
                      className="file-select"
                      aria-pressed={entry.id === selected}
                      onClick={() => setSelected(entry.id)}
                    >
                      <span className="file-icon">
                        <FileAudio size={21} />
                      </span>
                      <span className="file-text">
                        <strong>
                          {entry.metadata?.common.title || entry.file.name}
                        </strong>
                        <small>
                          {entry.error
                            ? "Could not read file"
                            : !entry.metadata
                              ? "Analyzing…"
                              : `${entry.metadata.format.container || "Audio"} · ${bytes(entry.file.size)}`}
                        </small>
                      </span>
                      {entry.metadata && (
                        <Check className="file-check" size={14} />
                      )}
                    </button>
                    <button
                      className="remove-file"
                      aria-label={`Remove ${entry.file.name}`}
                      onClick={() => remove(entry.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-files">
                <FileAudio size={28} strokeWidth={1.3} />
                <p>A home for your audio files</p>
                <small>Add a file to get started.</small>
              </div>
            )}
            <div className="local-note">
              <ShieldCheck size={17} />
              <p>
                Private by design.
                <br />
                <span>No uploads. No account needed.</span>
              </p>
            </div>
          </aside>
          <section
            className="result-panel"
            aria-label="Audio analysis"
            aria-live="polite"
          >
            {active ? (
              <Detail key={active.id} entry={active} />
            ) : (
              <div className="empty-state">
                <div className="empty-art">
                  <div className="orbit" />
                  <div className="record">
                    <div />
                  </div>
                  <span className="floating-tag">
                    <Tags size={22} />
                  </span>
                  <span className="floating-music">
                    <Music2 size={18} />
                  </span>
                </div>
                <span className="eyebrow">LOOK BEYOND THE PLAY BUTTON</span>
                <h2>Meet your music’s metadata.</h2>
                <p>
                  Choose an audio file to uncover its full story,
                  <br />
                  from artist and album to the smallest technical detail.
                </p>
                <div className="feature-chips">
                  <span>
                    <Tags size={14} />
                    Every tag
                  </span>
                  <span>
                    <Image size={14} />
                    Cover artwork
                  </span>
                  <span>
                    <Headphones size={14} />
                    Audio playback
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
        <div className="bottom-note">
          <ShieldCheck size={15} />
          <span>Nothing is uploaded or stored. Your files stay yours.</span>
        </div>
      </main>
      <footer>
        <span>Built for the love of music, and its metadata.</span>
        <a
          href="https://github.com/Borewit/music-metadata"
          target="_blank"
          rel="noreferrer"
        >
          Powered by <strong>music-metadata</strong>
          <ArrowUpRight size={13} />
        </a>
      </footer>
    </>
  );
}
