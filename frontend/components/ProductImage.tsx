import Image from 'next/image';

/**
 * A marketplace product shot.
 *
 * The product art in /public is 1376x768 and 600 KB–1.1 MB apiece, and a plain
 * <img> handed the browser every one of those bytes to paint a card roughly
 * 300 px wide. Eight cards in the grid meant ~6.5 MB per visit, which is most
 * of what Observability was reporting as Fast Data Transfer. next/image serves
 * an AVIF/WebP variant cut to the size actually rendered instead.
 *
 * `imageSrc` is an admin-editable free-text field ("3D Image Asset URL"), so it
 * can hold a host that is not in `images.remotePatterns` — next/image throws on
 * those at render time. Anything that is not a local, root-relative path falls
 * back to the plain <img> that was there before, which keeps an externally
 * hosted product image working exactly as it does today.
 */
function isLocal(src: string) {
  return src.startsWith('/') && !src.startsWith('//');
}

/**
 * Fills its positioned parent — the parent needs `relative` and its own size.
 * `sizes` describes the *rendered* width so the optimizer picks a sane variant
 * rather than the widest one in the srcset.
 */
export function ProductImageFill({
  src,
  alt,
  className = '',
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  if (!isLocal(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} loading="lazy" />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}

/** A fixed-size thumbnail — checkout summary, admin table row. */
export function ProductImageThumb({
  src,
  alt,
  width,
  height,
  className = '',
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  if (!isLocal(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} loading="lazy" />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={`${width}px`}
      className={className}
    />
  );
}
