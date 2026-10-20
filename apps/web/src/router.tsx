import { createBrowserRouter, Navigate } from 'react-router'

import { RootLayout } from './routes/root-layout'

/** Rotas do SPA. Páginas mais pesadas carregam sob demanda. */
export const router = createBrowserRouter([
    {
        Component: RootLayout,
        children: [
            // O produto é o painel: quem abre o endereço cai direto nele
            { index: true, element: <Navigate to="/painel" replace /> },
            { path: 'demo', element: <Navigate to="/painel/integracao" replace /> },
            {
                path: 'painel',
                lazy: () => import('./routes/painel/layout').then((m) => ({ Component: m.default })),
                children: [
                    { index: true, element: <Navigate to="/painel/envelopes" replace /> },
                    {
                        path: 'envelopes',
                        lazy: () => import('./routes/painel/envelopes').then((m) => ({ Component: m.default })),
                    },
                    {
                        path: 'envelopes/:id',
                        lazy: () => import('./routes/painel/envelope').then((m) => ({ Component: m.default })),
                    },
                    {
                        path: 'enviar',
                        lazy: () => import('./routes/painel/enviar').then((m) => ({ Component: m.default })),
                    },
                    {
                        path: 'integracao',
                        lazy: () => import('./routes/painel/integracao').then((m) => ({ Component: m.default })),
                    },
                    {
                        path: 'configuracoes',
                        lazy: () => import('./routes/painel/configuracoes').then((m) => ({ Component: m.default })),
                    },
                    {
                        path: 'modelos',
                        lazy: () => import('./routes/painel/modelos').then((m) => ({ Component: m.default })),
                    },
                    {
                        path: 'modelos/novo',
                        lazy: () => import('./routes/painel/modelo-novo').then((m) => ({ Component: m.default })),
                    },
                    {
                        path: 'modelos/:id',
                        lazy: () => import('./routes/painel/modelo').then((m) => ({ Component: m.default })),
                    },
                ],
            },
            { path: 's/:token', lazy: () => import('./routes/sign').then((m) => ({ Component: m.default })) },
            { path: 'v', lazy: () => import('./routes/verify').then((m) => ({ Component: m.default })) },
            { path: 'v/:code', lazy: () => import('./routes/verify-code').then((m) => ({ Component: m.default })) },
            { path: '*', lazy: () => import('./routes/not-found').then((m) => ({ Component: m.default })) },
        ],
    },
])
