import { createBrowserRouter, Navigate } from 'react-router'

import { Shell } from './components/shell'
import { useHostStatus } from './lib/status'
import { ContractsPage } from './pages/contracts'
import { DocsPage } from './pages/docs'
import { InboxPage } from './pages/inbox'
import { IntegrationsPage } from './pages/integrations'

function Home() {
    const { status } = useHostStatus()
    if (!status) return null
    return <Navigate to={status.active ? '/atendimento' : '/integracoes'} replace />
}

export const router = createBrowserRouter([
    {
        Component: Shell,
        children: [
            { index: true, Component: Home },
            { path: 'atendimento', Component: InboxPage },
            { path: 'contratos', Component: ContractsPage },
            { path: 'integracoes', Component: IntegrationsPage },
            { path: 'docs', Component: DocsPage },
            { path: '*', element: <Navigate to="/" replace /> },
        ],
    },
])
