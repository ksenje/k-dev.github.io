import { about } from '../../data/site'
import { GlassPanel } from '../ui/GlassPanel'
import { Reveal, SectionHeading } from '../ui/Reveal'

export function About() {
  const paragraphs = about.paragraphs

  return (
    <section id="about" className="section relative px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div>
            <SectionHeading eyebrow={about.eyebrow} title={about.title} highlight={about.highlight} />

            <div className="mt-7 space-y-4">
              {paragraphs.map((text, index) => (
                <Reveal key={index} delay={0.08 + index * 0.08}>
                  <p className="max-w-[52ch] text-[0.97rem] leading-relaxed text-frost-300/90">{text}</p>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {about.cards.map((card, index) => (
              <GlassPanel
                key={card.title}
                reveal
                delay={0.1 + index * 0.1}
                tilt={4}
                className={index === 1 ? 'p-6 sm:col-span-2 sm:min-h-[180px]' : 'p-6 sm:min-h-[180px]'}
              >
                <h3 className="text-[1.02rem] font-medium tracking-tight text-frost-50">{card.title}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-frost-300/85">{card.text}</p>
              </GlassPanel>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}