import { useState } from 'react'
import { contact, contacts } from '../../data/site'
import { GlassPanel } from '../ui/GlassPanel'
import { Reveal, SectionHeading } from '../ui/Reveal'
import { CheckIcon, CopyIcon, TelegramIcon, WalletIcon } from '../ui/Icons'

type ChannelKey = 'telegram' | 'payments' | 'crypto'

export function Contact() {
  const [copied, setCopied] = useState(false)

  const address = contacts.ton
  const primary = contacts.telegram.url

  const channels: { key: ChannelKey; label: string; handle: string; url: string; cta: string }[] = [
    {
      key: 'telegram',
      label: 'Telegram',
      handle: contacts.telegram.label,
      url: primary,
      cta: 'Написать',
    },
    {
      key: 'payments',
      label: 'Платежи',
      handle: contacts.payments.label,
      url: contacts.payments.url,
      cta: 'Открыть',
    },
    {
      key: 'crypto',
      label: 'Крипта',
      handle: contacts.crypto.label,
      url: contacts.crypto.url,
      cta: 'Открыть',
    },
  ]

  const copyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section id="contact" className="section relative px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <GlassPanel reveal variant="strong" edge className="relative overflow-hidden px-6 py-12 sm:px-10 sm:py-16">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-48 left-1/2 -z-10 h-96 w-[150%] -translate-x-1/2 rounded-full"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(255,255,255,0.09) 0%, rgba(190,180,210,0.05) 45%, transparent 70%)',
              filter: 'blur(44px)',
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
              <p className="mx-auto mt-6 max-w-[48ch] text-[0.97rem] leading-relaxed text-frost-200/85">{contact.text}</p>
            </Reveal>

            <Reveal delay={0.24}>
              <a href={primary} target="_blank" rel="noreferrer noopener" className="btn btn-primary mt-9">
                <TelegramIcon className="h-[18px] w-[18px]" />
                {contact.button}
              </a>
            </Reveal>
          </div>

          <div className="hairline my-10" />

          <div className="grid gap-4 sm:grid-cols-3">
            {channels.map((channel, index) => (
              <GlassPanel key={channel.key} reveal delay={0.06 * index} tilt={4} variant="soft" className="p-5">
                <span className="mono-label">{channel.label}</span>
                <p className="mt-3 font-mono text-[1rem] text-frost-50">{channel.handle}</p>
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 inline-flex items-center gap-1.5 text-[0.85rem] text-frost-300 transition-colors hover:text-frost-50"
                >
                  {channel.cta}
                  <WalletIcon className="h-3.5 w-3.5 opacity-60" />
                </a>
              </GlassPanel>
            ))}
          </div>

          {address ? (
            <Reveal delay={0.12}>
              <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-white/10 bg-white/4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="mono-label">{contact.tonLabel}</span>
                  <p className="mt-2 font-mono text-[0.82rem] break-all text-frost-100">{address}</p>
                </div>
                <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={copyAddress}>
                  {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                  {copied ? contact.copiedLabel : contact.copyLabel}
                </button>
              </div>
            </Reveal>
          ) : null}
        </GlassPanel>
      </div>
    </section>
  )
}