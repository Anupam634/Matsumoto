'use client';

/**
 * 3D Matsumoto Token with multi-axial orbiting particle rings.
 * Enhanced pure CSS 3D transforms with ambient golden glow.
 */
export function Coin3D() {
  return (
    <div className="coin-stage relative grid h-[20rem] w-full place-items-center sm:h-[22rem]">
      {/* Ambient background glow ring */}
      <div className="absolute h-48 w-48 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />

      {/* Orbit rings with multi-axis rotation */}
      <div className="orbit h-[18rem] w-[18rem]" aria-hidden />
      <div className="orbit orbit--wide h-[22rem] w-[22rem]" aria-hidden />

      <div className="animate-float">
        <div className="coin">
          {/* Edge thickness slices */}
          <div className="coin-edge" style={{ transform: 'translateZ(-2px)' }} />
          <div className="coin-edge" style={{ transform: 'translateZ(-4px)' }} />
          <div className="coin-edge" style={{ transform: 'translateZ(-6px)' }} />
          <div className="coin-edge" style={{ transform: 'translateZ(-8px)' }} />

          {/* Front Face */}
          <div className="coin-face">
            <div className="flex flex-col items-center">
              <span className="text-6xl font-black tracking-tight drop-shadow-md">M</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-950 mt-1">
                MATSUMOTO
              </span>
            </div>
          </div>

          {/* Back Face */}
          <div className="coin-face coin-face--back">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black uppercase tracking-widest">BNB CHAIN</span>
              <span className="text-[10px] font-bold text-amber-950 mt-1">BEP-20 REWARDS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
