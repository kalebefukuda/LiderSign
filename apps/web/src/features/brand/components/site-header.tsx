import { Link } from 'react-router'

import { cn } from '@/lib/cn'
import { isOfficeHost } from '@/lib/url'

import { Logo } from './logo'

const officeLinks = [
    { href: '/liderhub', label: 'LíderHub (simulação)' },
    { href: '/painel', label: 'Painel' },
]

export function SiteHeader({ className }: { className?: string }) {
    const links = [...(isOfficeHost() ? officeLinks : []), { href: '/v', label: 'Verificar documento' }]
    return (
        <header className={cn('border-b border-line bg-white/90 backdrop-blur-sm', className)}>
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
                <Logo />
                <nav aria-label="Principal" className="flex items-center gap-1">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            to={link.href}
                            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink sm:inline-flex"
                        >
                            {link.label}
                        </Link>
                    ))}
                    <Link
                        to="/v"
                        className="inline-flex rounded-lg px-3 py-2 text-sm font-medium text-brand sm:hidden"
                    >
                        Verificar
                    </Link>
                </nav>
            </div>
        </header>
    )
}
