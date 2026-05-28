import type React from "react";

interface PillarLogoProps {
  className?: string;
  size?: number;
}

export default function PillarLogo({ className = "", size = 24 }: PillarLogoProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <title>Pillar Logo</title>
      {/* Capped roof arch */}
      <path
        d="M2.5 10L12 2L21.5 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Three vertical rounded pillars */}
      <rect x="6" y="12" width="2.5" height="9" rx="1.25" fill="currentColor" />
      <rect x="10.75" y="12" width="2.5" height="9" rx="1.25" fill="currentColor" />
      <rect x="15.5" y="12" width="2.5" height="9" rx="1.25" fill="currentColor" />
    </svg>
  );
}
