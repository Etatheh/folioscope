"use client";

import { useId } from "react";

type BrandLogoProps = { className?: string; title?: string };

export default function BrandLogo({ className = "h-8 w-8 shrink-0", title }: BrandLogoProps) {
  const id = useId();
  const borderId = id + "-border";
  const lineId = id + "-line";
  return (
    <svg width="512" height="512" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
  <rect width="64" height="64" rx="16" fill="#09090B"/>
  <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" stroke={`url(#${borderId})`} strokeWidth="1.5"/>
  <path d="M16 22V17C16 16.4477 16.4477 16 17 16H22" stroke="#71717A" strokeWidth="2.2" strokeLinecap="round"/>
  <path d="M42 16H47C47.5523 16 48 16.4477 48 17V22" stroke="#71717A" strokeWidth="2.2" strokeLinecap="round"/>
  <path d="M16 42V47C16 47.5523 16.4477 48 17 48H22" stroke="#71717A" strokeWidth="2.2" strokeLinecap="round"/>
  <path d="M42 48H47C47.5523 48 48 47.5523 48 47V42" stroke="#71717A" strokeWidth="2.2" strokeLinecap="round"/>
  <path d="M19 41L28 33L35 36L45 22" stroke={`url(#${lineId})`} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
  <circle cx="45" cy="22" r="3.5" fill="#A78BFA"/>
  <defs>
    <linearGradient id={borderId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop stopColor="#3F3F46"/>
      <stop offset="1" stopColor="#18181B"/>
    </linearGradient>
    <linearGradient id={lineId} x1="19" y1="41" x2="45" y2="22" gradientUnits="userSpaceOnUse">
      <stop stopColor="#6366F1"/>
      <stop offset="1" stopColor="#C084FC"/>
    </linearGradient>
  </defs>
    </svg>
  );
}
