import React from 'react';

export function Logo({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Nailhub"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="32" r="32" fill="#F7C4D0" />
      <rect x="28.5" y="9" width="7" height="17" rx="3.5" fill="#1A1012" />
      <rect x="27" y="25" width="10" height="6" rx="1.5" fill="#B85273" />
      <rect x="18" y="30" width="28" height="23" rx="8" fill="#802334" />
      <path d="M23 36c0-1.7 1.3-3 3-3" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M48 11l1.6 4.4L54 17l-4.4 1.6L48 23l-1.6-4.4L42 17l4.4-1.6z" fill="#802334" />
      <path d="M13 22l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" fill="#FFFFFF" fillOpacity=".85" />
    </svg>
  );
}
