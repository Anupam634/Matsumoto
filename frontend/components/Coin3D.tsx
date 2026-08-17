'use client';

import Image from 'next/image';

/**
 * 3D BONDKOIN Token with official logo artwork (/bondkoin-logo.png),
 * multi-axial orbiting particle rings, and holographic ambient depth.
 */
export function Coin3D() {
  return (
    <div className="coin-stage relative grid h-[20rem] w-full place-items-center sm:h-[22rem]">
      {/* Ambient background aura glow */}
      <div className="absolute h-52 w-52 rounded-full bg-amber-500/25 blur-3xl pointer-events-none" />

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

          {/* Front Face: Real Official BONDKOIN Logo Mark */}
          <div className="coin-face overflow-hidden p-3 border-2 border-amber-300/60 bg-slate-950">
            <div className="relative h-full w-full flex flex-col items-center justify-center">
              <Image
                src="/bondkoin-logo.png"
                alt="BONDKOIN Official Emblem"
                width={150}
                height={150}
                priority
                className="h-28 w-28 rounded-full object-cover drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
              />
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 mt-1 font-mono">
                $BONDKOIN
              </span>
            </div>
          </div>

          {/* Back Face: Real Official BONDKOIN Logo Mark */}
          <div className="coin-face coin-face--back overflow-hidden p-3 border-2 border-amber-300/60 bg-slate-950">
            <div className="relative h-full w-full flex flex-col items-center justify-center">
              <Image
                src="/bondkoin-logo.png"
                alt="BONDKOIN BEP-20"
                width={150}
                height={150}
                className="h-28 w-28 rounded-full object-cover drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
              />
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 mt-1 font-mono">
                BNB CHAIN BEP-20
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
