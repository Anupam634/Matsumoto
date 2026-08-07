/**
 * The hero's 3D token: a glossy spinning coin resting on a pedestal, with
 * two tilted orbit rings (each carrying a small glowing particle) and a
 * couple of twinkling sparkle accents.
 *
 * Pure CSS transforms and gradients — no canvas, no WebGL, no image
 * downloads — so the hero still renders instantly and the PWA stays light.
 */
export function Coin3D() {
  return (
    <div className="coin-stage relative grid h-[24rem] w-full place-items-center">
      {/* Orbit rings, tilted flat and counter-rotating — each carries a
          small particle riding its rim. */}
      <div className="orbit h-[19rem] w-[19rem]" aria-hidden>
        <span className="orbit-particle" />
      </div>
      <div className="orbit orbit--wide h-[23rem] w-[23rem]" aria-hidden>
        <span className="orbit-particle" />
      </div>

      {/* Twinkling sparkle accents. */}
      <Sparkle className="left-[14%] top-[18%] h-5 w-5" delay="0s" />
      <Sparkle className="right-[10%] top-[38%] h-3 w-3" delay="0.9s" />
      <Sparkle className="bottom-[22%] right-[20%] h-4 w-4" delay="1.6s" />

      <div className="animate-float">
        <div className="coin">
          {/* Thickness: a few stacked slices behind the front face. */}
          <div className="coin-edge" style={{ transform: 'translateZ(-2px)' }} />
          <div className="coin-edge" style={{ transform: 'translateZ(-4px)' }} />
          <div className="coin-edge" style={{ transform: 'translateZ(-6px)' }} />

          <div className="coin-face">
            <span className="text-6xl tracking-tight">M</span>
          </div>
          <div className="coin-face coin-face--back">
            <span className="text-xl uppercase tracking-widest">Matsumoto</span>
          </div>
        </div>
        <div className="coin-pedestal" aria-hidden />
      </div>
    </div>
  );
}

function Sparkle({
  className,
  delay,
}: {
  className: string;
  delay: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`sparkle ${className}`}
      style={{ animationDelay: delay }}
      aria-hidden
    >
      <path d="M12 0c.9 5.6 2.4 8.6 5.6 9.9 3.2.9 4.6 1.6 6.4 2.1-1.8.5-3.2 1.2-6.4 2.1-3.2 1.3-4.7 4.3-5.6 9.9-.9-5.6-2.4-8.6-5.6-9.9C3.2 12.6 1.8 11.9 0 11.4c1.8-.5 3.2-1.2 6.4-2.1C9.6 8 11.1 5.6 12 0Z" />
    </svg>
  );
}
