import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as React from 'react'

import { cn } from '@/lib/cn'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            className={cn('inline-flex items-center gap-1 rounded-[10px] bg-surface p-1', className)}
            {...props}
        />
    )
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            className={cn(
                'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition-colors duration-150 hover:text-ink data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-[0_1px_2px_rgba(11,18,32,0.08)] [&_svg]:size-4',
                className,
            )}
            {...props}
        />
    )
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            className={cn('outline-none data-[state=active]:animate-enter', className)}
            {...props}
        />
    )
}
