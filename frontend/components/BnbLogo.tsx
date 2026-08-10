/**
 * The BNB Chain mark.
 *
 * Drawn as a path rather than shipped as an image so it inherits the
 * surrounding text colour and stays crisp at the 12–16px sizes it is used at.
 */
export function BnbLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 126.61 126.61"
      className={className}
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M38.13 53.75l24.98-24.98 24.99 24.99 14.53-14.53L63.11 0 23.6 39.51z" />
      <path d="M0 63.3l14.53-14.53L29.06 63.3 14.53 77.83z" />
      <path d="M38.13 72.85l24.98 24.98 24.99-24.98 14.54 14.52-.01.01-39.52 39.51-39.51-39.5-.02-.02z" />
      <path d="M97.55 63.31l14.53-14.53 14.53 14.53-14.53 14.53z" />
      <path d="M77.85 63.3h.01L63.11 48.57 52.22 59.46l-1.25 1.25-2.58 2.58-.02.02.02.02 14.72 14.72L77.86 63.3z" />
    </svg>
  );
}

/** Small "BNB Chain" pill used next to on-chain figures and payment steps. */
export function BnbBadge({ label }: { label: string }) {
  return (
    <span className="bnb-badge">
      <BnbLogo className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
