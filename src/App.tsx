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
import { Payments } from './components/sections/Payments'
import { Skills } from './components/sections/Skills'
import { Contact } from './components/sections/Contact'
import { useCustomCursorEnabled } from './lib/pointer'
import { usePrefersReducedMotion } from './hooks/useEnvironment'

export default function App() {
  useCustomCursorEnabled()

  return (
    <div className="relative min-h-screen">
      <Intro />

      <AuroraBackground />

      {/* one canvas for all snow depths */}
      <Snowfall />

      <CursorLight />

      <Navbar />

      <main className="relative z-10">
        <Hero />
        <About />
        <Music />
        <Skills />
        <Payments />
        <Contact />
      </main>

      <Footer />

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