import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost'

type GlassButtonProps = {
  children: ReactNode
  onClick?: () => void
  href?: string
  variant?: Variant
  size?: 'md' | 'sm'
  className?: string
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  ariaLabel?: string
  external?: boolean
}

/** Liquid glass button: transparent material, thin rim, hover lift, press in. */
export function GlassButton({
  children,
  onClick,
  href,
  variant = 'ghost',
  size = 'md',
  className = '',
  type = 'button',
  ariaLabel,
  external = false,
}: GlassButtonProps) {
  const classes = ['btn', variant === 'primary' ? 'btn-primary' : 'btn-ghost', size === 'sm' ? 'btn-sm' : '', className]
    .filter(Boolean)
    .join(' ')

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        aria-label={ariaLabel}
        {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        {children}
      </a>
    )
  }

  return (
    <button type={type} className={classes} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  )
}