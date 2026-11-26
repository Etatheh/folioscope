"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Reveal, StaggerGroup } from "@/components/ui/Reveal";
import styles from "./contact.module.css";

// Edit contact details here. Replace the example.com URLs before enabling socials.
const SUPPORT_EMAIL = "support@folioscope.live";
const SOCIAL_LINKS = [
  { name: "X / Twitter", icon: "x", href: "https://example.com/folioscope/x", detail: "Notes & updates" },
  { name: "GitHub", icon: "github", href: "https://example.com/folioscope/github", detail: "Follow the build" },
  { name: "Discord", icon: "discord", href: "https://example.com/folioscope/discord", detail: "Join the conversation" },
] as const;
const TOPICS = ["General inquiry", "Product support", "Feedback & ideas", "Partnerships"] as const;

type Field = "name" | "email" | "topic" | "message";
type Inquiry = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

function Icon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    message: <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    x: <><path d="m4 3 12.5 18H20L7.5 3H4Z" /><path d="m20 3-7 8M4 21l7-8" /></>,
    github: <><path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7M15 22v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.6-1.3 5.6-6A4.7 4.7 0 0 0 18.5 7a4.3 4.3 0 0 0-.1-3.3S17.3 3.4 15 5a11.5 11.5 0 0 0-6 0C6.7 3.4 5.6 3.7 5.6 3.7A4.3 4.3 0 0 0 5.5 7a4.7 4.7 0 0 0-1.3 3.3c0 4.7 2.9 5.7 5.6 6a3 3 0 0 0-.8 2.3V22" /></>,
    discord: <><path d="M8 5.5a16 16 0 0 0-4 1.3C2.4 9.2 1.8 12 2 15a16 16 0 0 0 5 2.5l1-1.7m8-10.3a16 16 0 0 1 4 1.3c1.6 2.4 2.2 5.2 2 8.2a16 16 0 0 1-5 2.5l-1-1.7M7 6.5a18 18 0 0 1 10 0M7 15a13 13 0 0 0 10 0" /><circle cx="8.5" cy="11.5" r="1" /><circle cx="15.5" cy="11.5" r="1" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`h-5 w-5 shrink-0 ${className}`}>{paths[name]}</svg>;
}

export default function ContactContent() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [requestError, setRequestError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);


  async function copyEmail() {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    copyTimer.current = setTimeout(() => setCopyState("idle"), 3000);
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const values = Object.fromEntries((["name", "email", "topic", "message"] as const).map((key) => [key, String(data.get(key) ?? "").trim()])) as Inquiry;
    const next: Errors = {};
    if (!values.name) next.name = "Please enter your name.";
    else if (values.name.length > 100) next.name = "Please use 100 characters or fewer.";
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;
    if (!values.email || emailInput.validity.typeMismatch) next.email = "Please enter a valid email address.";
    else if (values.email.length > 254) next.email = "Please use 254 characters or fewer.";
    if (!TOPICS.some((topic) => topic === values.topic)) next.topic = "Please choose a topic.";
    if (values.message.length < 10) next.message = "Please include at least 10 characters.";
    else if (values.message.length > 5000) next.message = "Please use 5,000 characters or fewer.";
    setErrors(next);
    const first = (Object.keys(next) as Field[])[0];
    if (first) {
      (form.elements.namedItem(first) as HTMLElement)?.focus();
      return;
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    setInquiry(values);
    setAccepted(false);
    setResponseText(""); setRequestError(""); setStreaming(true);
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values), signal: controller.signal });
      if (!response.ok || !response.body) {
        const problem = await response.json().catch(() => null);
        throw new Error(problem?.error || "We couldn’t load your response. Please try again or email us directly.");
      }
      if (response.headers.get("X-Contact-Accepted") !== "1") throw new Error("Email submission could not be confirmed.");
      setAccepted(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let received = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        received += decoder.decode(value, { stream: true });
        setResponseText(received);
      }
      received += decoder.decode();
      if (!received.trim()) throw new Error("No response received. Please try again or email us directly.");
      setResponseText(received);
    } catch (error) {
      if (!controller.signal.aborted) setRequestError(error instanceof Error ? error.message : "Please try again or email us directly.");
    } finally {
      activeRequest.current = null;
      if (!controller.signal.aborted) setStreaming(false);
    }
  }

  function clearError(field: Field) {
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  const mailto = inquiry
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[${inquiry.topic}] Inquiry from ${inquiry.name}`)}&body=${encodeURIComponent(`${inquiry.message}\n\nFrom: ${inquiry.name}\nReply to: ${inquiry.email}`)}`
    : `mailto:${SUPPORT_EMAIL}`;

  return (
    <StaggerGroup className="grid items-stretch gap-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="grid min-w-0 gap-6">
        <Reveal inherit><section aria-labelledby="email-heading" className={`${styles.card} ${styles.emailCard} p-7 sm:p-8`}>
          <span className={styles.iconTile}><Icon name="mail" /></span>
          <h2 id="email-heading" className="mt-6 text-xl font-semibold tracking-tight text-zinc-50">A direct line.</h2>
          <p className="mt-3 leading-7 text-zinc-400">For product questions, account help, and everything in between.</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className={`${styles.email} mt-7 inline-block text-lg font-medium tracking-tight text-zinc-100`}>{SUPPORT_EMAIL}</a>
          <div className="mt-4 flex min-h-10 flex-wrap items-center gap-3">
            <button type="button" onClick={copyEmail} className={styles.secondaryButton} aria-label="Copy support email">
              <Icon name={copyState === "copied" ? "check" : "copy"} className="!h-4 !w-4" />
              {copyState === "copied" ? "Copied" : "Copy email"}
            </button>
            <span role="status" className="text-sm text-indigo-300">{copyState === "copied" ? "Email copied to clipboard." : copyState === "error" ? "Please select and copy the email above." : ""}</span>
          </div>
        </section></Reveal>

        <Reveal inherit><section aria-labelledby="social-heading" className={`${styles.card} p-7 sm:p-8`}>
          <h2 id="social-heading" className="text-xl font-semibold tracking-tight text-zinc-50">Around the web.</h2>
          <p className="mt-3 leading-7 text-zinc-400">Follow along as FolioScope takes shape.</p>
          <div className="mt-6 grid gap-2">
            {SOCIAL_LINKS.map((social) => (
              <a key={social.icon} href={social.href} target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label={`${social.name} (placeholder, opens in a new tab)`}>
                <span className={styles.socialIcon}><Icon name={social.icon} /></span>
                <span><span className="block text-sm font-medium text-zinc-100">{social.name}</span><span className="mt-0.5 block text-sm text-zinc-400">{social.detail}</span></span>
              </a>
            ))}
          </div>
          <p className="mt-5 text-xs text-zinc-500">Social channels coming soon.</p>
        </section></Reveal>
      </div>

      <Reveal inherit className="min-w-0"><section aria-labelledby="inquiry-heading" className={`${styles.card} ${styles.formCard} min-w-0 p-7 sm:p-8`}>
            <div className="flex items-center gap-3 text-indigo-300"><Icon name="message" /><h2 id="inquiry-heading" className="text-xl font-semibold tracking-tight text-zinc-50">Start a conversation.</h2></div>
            <p className="mt-3 leading-7 text-zinc-400">Tell us what’s on your mind. A little context goes a long way.</p>
            <form noValidate onSubmit={submitInquiry} className="mt-8 flex flex-1 flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className={styles.label}>Name</label>
                  <input id="contact-name" name="name" autoComplete="name" required maxLength={100} placeholder="Your name" className={styles.input} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} onChange={() => clearError("name")} />
                  {errors.name && <p id="name-error" className={styles.error}>{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="contact-email" className={styles.label}>Email</label>
                  <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" className={styles.input} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} onChange={() => clearError("email")} />
                  {errors.email && <p id="email-error" className={styles.error}>{errors.email}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="contact-topic" className={styles.label}>Topic</label>
                <div className="relative">
                  <select id="contact-topic" name="topic" required defaultValue="" className={`${styles.input} ${styles.select}`} aria-invalid={!!errors.topic} aria-describedby={errors.topic ? "topic-error" : undefined} onChange={() => clearError("topic")}>
                    <option value="" disabled>Select a topic</option>
                    {TOPICS.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                  </select>
                  <Icon name="chevron" className="pointer-events-none absolute top-3.5 right-4 text-zinc-500" />
                </div>
                {errors.topic && <p id="topic-error" className={styles.error}>{errors.topic}</p>}
              </div>
              <div>
                <label htmlFor="contact-message" className={styles.label}>Message</label>
                <textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={5} placeholder="How can we help?" className={`${styles.input} ${styles.textarea}`} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-hint message-error" : "message-hint"} onChange={() => clearError("message")} />
                {errors.message && <p id="message-error" className={styles.error}>{errors.message}</p>}
                <p id="message-hint" className="mt-2 text-xs leading-5 text-zinc-500">10–5,000 characters. Please leave out passwords and payment details.</p>
              </div>
              <div className="mt-auto border-t border-white/10 pt-5">
                <button type="submit" disabled={streaming} className="ml-auto flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300 disabled:cursor-wait disabled:opacity-60">{streaming ? accepted ? "Sent" : "Sending…" : "Send message"}<span aria-hidden="true">→</span></button>
                <p className="mt-3 text-right text-xs leading-5 text-zinc-400">Your message goes to FolioScope support. We can reply to the email address you provide.</p>
              </div>
            </form>
      </section></Reveal>
      {inquiry && (
        <Reveal key="support-response" scroll={false} className="min-w-0 md:col-span-2">
          <section aria-labelledby="response-heading" aria-busy={streaming} className={`${styles.card} p-7 sm:p-8`}>
            <p className="text-sm text-indigo-300">FOLIOSCOPE SUPPORT</p>
            <h2 id="response-heading" className="mt-3 text-xl font-semibold tracking-tight text-zinc-50">{accepted ? "Message sent to support." : streaming ? "Sending your message…" : "Email submission unavailable."}</h2>
            <p className="mt-4 whitespace-pre-wrap leading-7 text-zinc-300">{responseText || (streaming ? "Please wait…" : "")}{streaming && <span aria-hidden="true" className={styles.cursor} />}</p>
            <p role="status" className="sr-only">{streaming ? "Processing your inquiry." : requestError ? "The response could not be completed." : "Message sent to support."}</p>
            {requestError && !accepted && <p role="alert" className={styles.error}>{requestError}</p>}
            {requestError && !accepted && <a href={mailto} className={`${styles.secondaryButton} mt-6`}><Icon name="mail" />Open email app</a>}
          </section>
        </Reveal>
      )}
    </StaggerGroup>
  );
}
