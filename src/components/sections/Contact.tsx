import { contact } from '../../data/site'
import { GlassPanel } from '../ui/GlassPanel'
import { Reveal, SectionHeading } from '../ui/Reveal'
import { ArrowUpRightIcon, TelegramIcon } from '../ui/Icons'

/** Compact brand badge: reliable across engines, unlike a traced logo path. */
function ChannelMark({ title }: { title: string }) {
  if (title === 'Telegram') {
    return <TelegramIcon className="h-[18px] w-[18px] text-frost-100" />
  }

  return (
    <span className="grid h-[18px] w-[18px] place-items-center rounded-[5px] border border-white/20 bg-white/10 font-mono text-[0.55rem] font-medium tracking-tight text-frost-100">
      {title.slice(0, 2)}
    </span>
  )
}

export function Contact() {
  return (
    <section id="contact" className="section relative px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <GlassPanel reveal variant="strong" edge className="relative overflow-hidden px-6 py-12 sm:px-10 sm:py-16">
          {/* contained glow: the panel clips it */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-48 left-1/2 -z-10 h-96 w-[150%] -translate-x-1/2 rounded-full"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(255,255,255,0.09) 0%, rgba(190,180,210,0.05) 45%, transparent 70%)',
            }}
          />

          <div className="text-center">
            <Reveal>
              <SectionHeading
                eyebrow={contact.eyebrow}
                title={contact.title}
                highlight={contact.highlight}
                align="center"
              />
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mx-auto mt-6 max-w-[48ch] text-[0.97rem] leading-relaxed text-frost-200/85">
                {contact.text}
              </p>
            </Reveal>
          </div>

          <div className="hairline my-10" />

          <div className="grid gap-4 sm:grid-cols-2">
            {contact.channels.map((channel, index) => (
              <GlassPanel key={channel.key} reveal delay={0.06 * index} variant="soft" className="p-5">
                <div className="flex items-center gap-2.5">
                  <ChannelMark title={channel.title} />
                  <h3 className="text-[0.95rem] font-medium tracking-tight text-frost-50">{channel.title}</h3>
                </div>
                <p className="mt-3 font-mono text-[0.95rem] text-frost-200">{channel.handle}</p>
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm mt-5"
                >
                  {channel.cta}
                  <ArrowUpRightIcon className="h-3.5 w-3.5" />
                </a>
              </GlassPanel>
            ))}
          </div>
        </GlassPanel>
      </div>
    </section>
  )
}