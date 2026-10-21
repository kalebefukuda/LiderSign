import * as React from 'react'

import { cn } from '@lidersign/ui'

export function Page({
    title,
    description,
    actions,
    children,
    className,
}: {
    title: string
    description?: React.ReactNode
    actions?: React.ReactNode
    children: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                'mx-auto w-full max-w-[1120px] px-5 py-8 sm:px-8 sm:py-10 animate-enter',
                className,
            )}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-[26px] font-bold tracking-[-0.03em]">{title}</h1>
                    {description ? (
                        <p className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-muted">
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
            </div>
            <div className="mt-8">{children}</div>
        </div>
    )
}
