import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as React from 'react'

import { cn } from '../lib/cn'

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
    return (
        <SwitchPrimitive.Root
            className={cn(
                'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-line-strong transition-colors duration-200 ease-out data-[state=checked]:bg-brand disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        >
            <SwitchPrimitive.Thumb className="pointer-events-none block size-5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_2px_rgba(11,18,32,0.2)] transition-transform duration-200 ease-out data-[state=checked]:translate-x-[22px]" />
        </SwitchPrimitive.Root>
    )
}
