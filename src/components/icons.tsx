// src/components/icons.tsx
// SVG icon components for VoiceCast Studio.
// Each icon accepts an optional className prop for Tailwind sizing.
// Default size: w-4 h-4 (16x16) or w-3.5 h-3.5 (14x14) depending on the icon.

interface IconProps {
  className?: string;
}

export function IconPlus({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}

export function IconPlay({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="currentColor">
      <polygon points="2,1 12,7 2,13" />
    </svg>
  );
}

export function IconStop({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="currentColor">
      <rect x="2" y="2" width="10" height="10" rx="1" />
    </svg>
  );
}

export function IconTrash({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="2,4 12,4" />
      <path d="M5,4V2.5A.5.5,0,0,1,5.5,2h3a.5.5,0,0,1,.5.5V4" />
      <path d="M3,4L3.8,12.2a1,1,0,0,0,1,.8h4.4a1,1,0,0,0,1-.8L11,4" />
    </svg>
  );
}

export function IconEdit({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8.5,2.5l3,3L5,12H2V9Z" />
    </svg>
  );
}

export function IconUpload({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2,10v3a1,1,0,0,0,1,1h10a1,1,0,0,0,1-1V10" />
      <polyline points="5,5 8,2 11,5" /><line x1="8" y1="2" x2="8" y2="10" />
    </svg>
  );
}

export function IconDownload({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2,10v3a1,1,0,0,0,1,1h10a1,1,0,0,0,1-1V10" />
      <polyline points="5,8 8,11 11,8" /><line x1="8" y1="11" x2="8" y2="2" />
    </svg>
  );
}

export function IconBook({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2,2H6a2,2,0,0,1,2,2V13a1.5,1.5,0,0,0-1.5-1.5H2Z" />
      <path d="M14,2H10a2,2,0,0,0-2,2V13a1.5,1.5,0,0,1,1.5-1.5H14Z" />
    </svg>
  );
}

export function IconSave({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11,13H3a1,1,0,0,1-1-1V2A1,1,0,0,1,3,1H9l3,3v8A1,1,0,0,1,11,13Z" />
      <rect x="5" y="8" width="4" height="4" /><line x1="5" y1="1" x2="5" y2="4" />
    </svg>
  );
}

export function IconMic({ className = "w-[18px] h-[18px]" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6" y="1" width="6" height="9" rx="3" />
      <path d="M3,8a6,6,0,0,0,12,0" />
      <line x1="9" y1="14" x2="9" y2="17" /><line x1="6" y1="17" x2="12" y2="17" />
    </svg>
  );
}

export function IconX({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="3" x2="11" y2="11" /><line x1="11" y1="3" x2="3" y2="11" />
    </svg>
  );
}

export function IconCloud({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4,12H3a3,3,0,0,1,0-6,4,4,0,0,1,7.9-.7A3,3,0,0,1,13,8a3,3,0,0,1-1,5.8H4Z" />
    </svg>
  );
}

export function IconUser({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="5" r="3" />
      <path d="M2,14a6,6,0,0,1,12,0" />
    </svg>
  );
}

export function IconLogout({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5,2H3a1,1,0,0,0-1,1v8a1,1,0,0,0,1,1H5" />
      <polyline points="8,4 12,7 8,10" /><line x1="12" y1="7" x2="5" y2="7" />
    </svg>
  );
}

export function IconWave({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="7" x2="2" y2="13" /><line x1="5" y1="4" x2="5" y2="16" />
      <line x1="8" y1="6" x2="8" y2="14" /><line x1="11" y1="2" x2="11" y2="18" />
      <line x1="14" y1="5" x2="14" y2="15" /><line x1="17" y1="7" x2="17" y2="13" />
    </svg>
  );
}
