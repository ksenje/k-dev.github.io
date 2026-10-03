import { useIsTouch, usePrefersReducedMotion } from '../../hooks/useEnvironment'

type Blob = { className: string; background: string; animation: string }

/**
 * Very dim light sources behind all glass surfaces. Soft radial gradients only:
 * no filter blur, so the background stays cheap on phones.
 */
const BLOBS: Blob[] = [
  {
    className: '-top-[18%] -left-[14%] h-[62vw] w-[62vw] opacity-60',
    background: 'radial-gradient(circle, rgba(226,226,232,0.13) 0%, rgba(140,140,150,0.05) 44%, transparent 72%)',
    animation: 'aurora-a 38s ease-in-out infinite',
  },
  {
    className: 'top-[26%] -right-[14%] h-[58vw] w-[58vw] opacity-60',
    background: 'radial-gradient(circle, rgba(176,168,190,0.12) 0%, rgba(120,112,140,0.05) 46%, transparent 74%)',
    animation: 'aurora-b 46s ease-in-out infinite',
  },
  {
    className: 'bottom-[-16%] left-[24%] h-[54vw] w-[54vw] opacity-50',
    background: 'radial-gradient(circle, rgba(232,232,236,0.09) 0%, rgba(150,150,158,0.04) 46%, transparent 74%)',
    animation: 'aurora-c 42s ease-in-out infinite',
  },
]

export function AuroraBackground() {
  const isTouch = useIsTouch()
  const reduced = usePrefersReducedMotion()
  // Touch devices get a single light source, reduced motion gets none.
  const blobs = reduced ? [] : isTouch ? BLOBS.slice(0, 1) : BLOBS

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {blobs.map((blob) => (
        <div
          key={blob.animation}
          className={`absolute rounded-full ${blob.className}`}
          style={{
            background: blob.background,
            animation: isTouch ? 'none' : blob.animation,
            willChange: isTouch ? undefined : 'transform',
          }}
        />
      ))}

      {!isTouch ? <div className="absolute inset-0 grain opacity-[0.03] mix-blend-overlay" /> : null}

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% -10%, transparent 28%, rgba(3,3,3,0.6) 76%, rgba(3,3,3,0.95) 100%)',
        }}
      />
    </div>
  )
}