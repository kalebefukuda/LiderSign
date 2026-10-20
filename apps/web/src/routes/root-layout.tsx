import { Outlet, ScrollRestoration } from 'react-router'
import { Toaster } from 'sonner'

import { TooltipProvider } from '@/components/ui/tooltip'

export function RootLayout() {
    return (
        <TooltipProvider>
            <Outlet />
            <ScrollRestoration />
            <Toaster
                position="bottom-center"
                toastOptions={{
                    className: 'font-sans',
                    style: { borderRadius: 12, border: '1px solid #E6EAF2' },
                }}
            />
        </TooltipProvider>
    )
}
