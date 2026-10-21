import { Outlet, ScrollRestoration } from 'react-router'
import { Toaster } from 'sonner'

import { TooltipProvider } from '@lidersign/ui'

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
