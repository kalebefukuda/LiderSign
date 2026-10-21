import type * as React from 'react'

export function PageHeader({
    title,
    description,
    action,
}: {
    title: string
    description: string
    action?: React.ReactNode
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h1>
                <p className="mt-1 text-sm text-muted">{description}</p>
            </div>
            {action ? <div className="shrink-0 self-start">{action}</div> : null}
        </div>
    )
}

export function Tabs<T extends string>({
    value,
    onChange,
    items,
}: {
    value: T
    onChange: (value: T) => void
    items: { value: T; label: string; icon: React.ComponentType<{ className?: string }> }[]
}) {
    return (
        <div role="tablist" className="flex gap-6 border-b border-line">
            {items.map((item) => {
                const active = item.value === value
                return (
                    <button
                        key={item.value}
                        role="tab"
                        type="button"
                        aria-selected={active}
                        onClick={() => onChange(item.value)}
                        className={
                            active
                                ? '-mb-px inline-flex items-center gap-2 border-b-2 border-ink pb-3 text-sm font-medium text-ink'
                                : '-mb-px inline-flex items-center gap-2 border-b-2 border-transparent pb-3 text-sm font-medium text-muted hover:text-ink'
                        }
                    >
                        <item.icon className="size-4" />
                        {item.label}
                    </button>
                )
            })}
        </div>
    )
}
