import { motion } from 'framer-motion'
import { AuroraBackground } from './components/effects/AuroraBackground'
import { CursorLight } from './components/effects/CursorLight'
import { CustomCursor } from './components/effects/CustomCursor'
import { Snowfall } from './components/effects/Snowfall'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { Hero } from './components/sections/Hero'
import { About } from './components/sections/About'
import { Music } from './components/sections/Music'
import { Skills } from './components/sections/Skills'
import { Contact } from './components/sections/Contact'
import { MusicPlayer } from './components/music/MusicPlayer'
import { usePlayer } from './components/music/PlayerProvider'
import { useCustomCursorEnabled } from './lib/pointer'
import { usePrefersReducedMotion } from './hooks/useEnvironment'

export default function App() {
  useCustomCursorEnabled()
  const reduced = usePrefersReducedMotion()
  const { tracks } = usePlayer()

  return (
    <div className="relative min-h-screen">
      <Intro />

      <AuroraBackground />

      {/* snow behind the glass */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Snowfall layer="back" />
      </div>

      <CursorLight />

      <Navbar />

      <main className="relative z-10">
        <Hero />
        <About />
        {tracks.length > 0 ? <Music /> : null}
        <Skills />
        <Contact />
      </main>

      <Footer />

      <MusicPlayer />

      {/* snow drifting in front of the glass panels */}
      {!reduced ? (
        <div className="pointer-events-none fixed inset-0 z-[60]">
          <Snowfall layer="mid" opacity={0.45} />
          <Snowfall layer="front" opacity={0.6} />
        </div>
      ) : null}

      <CustomCursor />
    </div>
  )
}

function Intro() {
  const reduced = usePrefersReducedMotion()
  if (reduced) return null

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[200] bg-ink-950"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.2, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
    />
  )
}