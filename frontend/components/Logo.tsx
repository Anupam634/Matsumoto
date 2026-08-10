import Image from 'next/image';

/**
 * The Matsumoto emblem on its own — the circular mark without the wordmark.
 *
 * Used wherever the name is already spelled out beside it (headers, nav) or
 * where there is no room for the full lockup.
 */
export function LogoMark({
  size = 36,
  priority,
  className = '',
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/matsumoto-mark.png"
      alt="Matsumoto"
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}

/**
 * The full lockup — emblem stacked over the MATSUMOTO wordmark plate.
 *
 * Only worth using where it can render large enough to read: the auth brand
 * panel and the landing hero.
 */
export function LogoLockup({
  width = 260,
  priority,
  className = '',
}: {
  width?: number;
  priority?: boolean;
  className?: string;
}) {
  // Matches the artwork's own aspect ratio (640 × 579) so it never squashes.
  return (
    <Image
      src="/matsumoto-logo.png"
      alt="Matsumoto"
      width={width}
      height={Math.round((width * 579) / 640)}
      priority={priority}
      className={className}
    />
  );
}
