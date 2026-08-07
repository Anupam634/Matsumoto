/**
 * The hero's 3D token: a spinning coin inside two tilted orbit rings.
 * Pure CSS transforms — no canvas, no WebGL, no image downloads.
 */
export function Coin3D() {
  return (
    <div className="coin-stage relative grid h-[22rem] w-full place-items-center">
      {/* Orbit rings, tilted flat and counter-rotating. */}
      <div className="orbit h-[19rem] w-[19rem]" aria-hidden />
      <div className="orbit orbit--wide h-[22rem] w-[22rem]" aria-hidden />

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
      </div>
    </div>
  );
}
