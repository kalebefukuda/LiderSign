import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'

import { RootLayout } from './routes/root-layout'

const page = (load: () => Promise<{ default: ComponentType }>) => () =>
    load().then((module) => ({ Component: module.default }))

export const router = createBrowserRouter([
    {
        Component: RootLayout,
        children: [
            { index: true, element: <Navigate to="/atendimento" replace /> },
            { path: 'entrar', lazy: page(() => import('./routes/entrar')) },
            {
                lazy: page(() => import('./routes/app/layout')),
                children: [
                    { path: 'atendimento', lazy: page(() => import('./routes/app/atendimento')) },
                    { path: 'contratos', lazy: page(() => import('./routes/app/contratos')) },
                    { path: 'contratos/:id', lazy: page(() => import('./routes/app/contrato')) },
                    { path: 'modelos', lazy: page(() => import('./routes/app/modelos')) },
                    { path: 'modelos/novo', lazy: page(() => import('./routes/app/modelo-novo')) },
                    { path: 'modelos/:id', lazy: page(() => import('./routes/app/modelo')) },
                    { path: 'configuracoes', lazy: page(() => import('./routes/app/configuracoes')) },
                ],
            },
            { path: 'painel/*', element: <Navigate to="/atendimento" replace /> },
            { path: 's/:token', lazy: page(() => import('./routes/sign')) },
            { path: 'v', lazy: page(() => import('./routes/verify')) },
            { path: 'v/:code', lazy: page(() => import('./routes/verify-code')) },
            { path: '*', lazy: page(() => import('./routes/not-found')) },
        ],
    },
])
