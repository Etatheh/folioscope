"use client";

import { useEffect, useId, useRef, useState } from "react";

import { renderTicketPng, ticketAlt, ticketPostUrl, type TicketData, type TicketTheme } from "./ticket-canvas";
import styles from "./simulator.module.css";

const themes = [
  { value: "light", label: "Classic Light" },
  { value: "dark", label: "Midnight Dark" },
] as const;

export default function ShareTicket({ getData }: { getData: () => TicketData }) {
  const [snapshot, setSnapshot] = useState<TicketData | null>(null);

  return (
    <>
      <button
        type="button"
        className={styles.shareTrigger}
        aria-haspopup="dialog"
        onClick={() => setSnapshot(getData())}
      >
        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a3 3 0 0 0 0 6v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a3 3 0 0 0 0-6V7Z" />
          <path d="M15 6v12" strokeDasharray="2 2" />
        </svg>
        Share Ticket
      </button>
      {snapshot && <TicketDialog data={snapshot} close={() => setSnapshot(null)} />}
    </>
  );
}

type Preview = { blob: Blob; url: string };

function TicketDialog({ data, close }: { data: TicketData; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [theme, setTheme] = useState<TicketTheme>("dark");

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  function dismiss() {
    dialog.current?.close();
    close();
  }

  return (
    <dialog
      ref={dialog}
      className={styles.ticketDialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
    >
      <header className={styles.ticketHeader}>
        <h2 id={titleId}>Share your backtest</h2>
        <button type="button" className={styles.ticketClose} aria-label="Close share preview" onClick={dismiss}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div className={styles.ticketThemes} role="group" aria-label="Ticket theme">
        {themes.map(({ value, label }) => (
          <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)}>
            {label}
          </button>
        ))}
      </div>
      <TicketPreview key={theme} data={data} theme={theme} />
    </dialog>
  );
}

function TicketPreview({ data, theme }: { data: TicketData; theme: TicketTheme }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    let url: string | undefined;
    renderTicketPng(data, theme)
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setPreview({ blob, url });
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [data, theme]);

  async function copyImage() {
    if (!preview) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": preview.blob })]);
      setNotice("Ticket image copied to the clipboard.");
    } catch {
      setNotice("Clipboard unavailable. Use Download PNG to save the ticket.");
    }
  }

  const filename = `folioscope-ticket-${data.result.endDate}.png`;
  return (
    <>
      <div className={styles.ticketPreview} aria-busy={!error && !preview}>
        {preview ? (
          // The browser-generated PNG already has the exact export dimensions.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.url} width={2400} height={1260} alt={ticketAlt(data)} />
        ) : (
          <p role="status">{error ? "Couldn’t render the ticket. Close the preview and try again." : "Rendering ticket…"}</p>
        )}
      </div>
      <footer className={styles.ticketActions}>
        <button type="button" disabled={!preview} onClick={copyImage}>Copy Image</button>
        {preview ? <a href={preview.url} download={filename}>Download PNG</a> : <button type="button" disabled>Download PNG</button>}
        <a
          href={ticketPostUrl(data)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setNotice("Attach the copied or downloaded ticket in the X composer.")}
        >
          Post on X <span aria-hidden="true">↗</span>
        </a>
      </footer>
      <div className={styles.ticketFeedback} role="status">
        {notice && <p>{notice}</p>}
      </div>
    </>
  );
}
