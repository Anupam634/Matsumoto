import Image from 'next/image';

/**
 * The BONDKOIN emblem on its own — the circular mark.
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
      src="/bondkoin-logo.png"
      alt="BONDKOIN"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-full object-cover ${className}`}
    />
  );
}

/**
 * The full lockup — emblem stacked over the BONDKOIN wordmark plate.
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
  return (
    <Image
      src="/bondkoin-logo.png"
      alt="BONDKOIN"
      width={width}
      height={width}
      priority={priority}
      className={`rounded-2xl object-contain ${className}`}
    />
  );
}
