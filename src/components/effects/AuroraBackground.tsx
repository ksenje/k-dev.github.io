import { motion } from 'framer-motion'

/**
 * Very dim light sources behind all glass surfaces.
 * Neutral and violet hints only: nothing competes with the content.
 */
export function AuroraBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -top-[18%] -left-[14%] h-[62vw] w-[62vw] rounded-full opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(226,226,232,0.13) 0%, rgba(140,140,150,0.05) 44%, transparent 72%)',
          filter: 'blur(52px)',
          animation: 'aurora-a 38s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[26%] -right-[14%] h-[58vw] w-[58vw] rounded-full opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(176,168,190,0.12) 0%, rgba(120,112,140,0.05) 46%, transparent 74%)',
          filter: 'blur(56px)',
          animation: 'aurora-b 46s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-[-16%] left-[24%] h-[54vw] w-[54vw] rounded-full opacity-50"
        style={{
          background: 'radial-gradient(circle, rgba(232,232,236,0.09) 0%, rgba(150,150,158,0.04) 46%, transparent 74%)',
          filter: 'blur(58px)',
          animation: 'aurora-c 42s ease-in-out infinite',
        }}
      />
      <motion.div
        className="absolute inset-0 grain opacity-[0.03] mix-blend-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.03 }}
        transition={{ duration: 2.4, ease: 'easeOut' }}
      />
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