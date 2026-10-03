import { useState } from 'react'
import { payments, paymentsSection } from '../../data/site'
import { GlassPanel } from '../ui/GlassPanel'
import { Reveal, SectionHeading } from '../ui/Reveal'
import { ArrowUpRightIcon, CheckIcon, CopyIcon } from '../ui/Icons'

/** Short form for narrow layouts only. The full address stays in the data file. */
function shortTon(address: string): string {
  if (address.length <= 14) return address
  return `${address.slice(0, 4)}…${address.slice(-5)}`
}

export function Payments() {
  const [copied, setCopied] = useState(false)
  const address = payments.ton

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

  const methods = [
    { key: 'xrocket', title: 'xRocket', handle: payments.xrocket.label, url: payments.xrocket.url },
    { key: 'send', title: 'Send', handle: payments.send.label, url: payments.send.url },
  ]

  return (
    <section id="payments" className="section relative px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow={paymentsSection.eyebrow}
          title={paymentsSection.title}
          highlight={paymentsSection.highlight}
        />

        <Reveal delay={0.12}>
          <p className="mt-6 max-w-[52ch] text-[0.97rem] leading-relaxed text-frost-300/90">
            {paymentsSection.text}
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((method, index) => (
            <GlassPanel key={method.key} reveal delay={0.06 * index} variant="soft" className="flex flex-col p-5">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[0.98rem] font-medium tracking-tight text-frost-50">{method.title}</h3>
              </div>
              <p className="mt-3 font-mono text-[0.95rem] text-frost-200">{method.handle}</p>
              <a
                href={method.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm mt-5 self-start"
              >
                {paymentsSection.openLabel}
                <ArrowUpRightIcon className="h-3.5 w-3.5" />
              </a>
            </GlassPanel>
          ))}

          <GlassPanel reveal delay={0.12} variant="soft" className="flex flex-col p-5">
            <div className="flex items-center gap-2.5">
              <h3 className="text-[0.98rem] font-medium tracking-tight text-frost-50">TON</h3>
            </div>

            <p className="mt-3 font-mono text-[0.95rem] text-frost-200" title={address}>
              {shortTon(address)}
            </p>

            <button type="button" className="btn btn-ghost btn-sm mt-5 self-start" onClick={copyAddress}>
              {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
              {copied ? paymentsSection.copiedLabel : paymentsSection.copyLabel}
            </button>
            <span className="sr-only" aria-live="polite">
              {copied ? paymentsSection.copiedLabel : ''}
            </span>
          </GlassPanel>
        </div>
      </div>
    </section>
  )
}