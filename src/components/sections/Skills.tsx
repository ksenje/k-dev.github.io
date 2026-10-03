import { skills } from '../../data/site'
import { GlassPanel } from '../ui/GlassPanel'
import { SectionHeading } from '../ui/Reveal'

export function Skills() {
  return (
    <section id="skills" className="section relative px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow={skills.eyebrow} title={skills.title} highlight={skills.highlight} />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {skills.groups.map((group, index) => (
            <GlassPanel key={group.title} reveal delay={0.08 + index * 0.1} tilt={3} className="p-6">
              <h3 className="text-[0.95rem] font-medium tracking-tight text-frost-50">{group.title}</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[0.82rem] text-frost-200"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </GlassPanel>
          ))}
        </div>
      </div>
    </section>
  )
}