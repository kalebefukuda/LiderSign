import { createBrowserRouter, Navigate } from 'react-router'

import { isOfficeHost } from './lib/url'
import { RootLayout } from './routes/root-layout'

/** Rotas do SPA. Páginas mais pesadas carregam sob demanda. */
export const router = createBrowserRouter([
    {
        Component: RootLayout,
        children: [
            // No computador do escritório, a demonstração começa pela LíderHub (é de lá que se usa o LíderSign).
            // Pelo endereço público, quem chega é cliente: vai para a verificação.
            { index: true, element: <Navigate to={isOfficeHost() ? '/liderhub' : '/v'} replace /> },
            { path: 'demo', element: <Navigate to="/liderhub" replace /> },
            {
                path: 'liderhub',
                lazy: () => import('./routes/liderhub').then((m) => ({ Component: m.default })),
            },
            {
                path: 'desenvolvedores',
                lazy: () => import('./routes/desenvolvedores').then((m) => ({ Component: m.default })),
            },
            {
                path: 'painel',
                lazy: () => import('./routes/painel/layout').then((m) => ({ Component: m.default })),
                children: [
                    {
                        index: true,
                        lazy: () => import('./routes/painel/inicio').then((m) => ({ Component: m.default })),
                    },
                    {
                        path: 'envelopes',
                        lazy: () =>
                            import('./routes/painel/envelopes').then((m) => ({ Component: m.default })),
                    },
                    {
                        path: 'envelopes/:id',
                        lazy: () =>
                            import('./routes/painel/envelope').then((m) => ({ Component: m.default })),
                    },
                    {
                        path: 'enviar',
                        lazy: () => import('./routes/painel/enviar').then((m) => ({ Component: m.default })),
                    },
                    { path: 'integracao', element: <Navigate to="/desenvolvedores" replace /> },
                    { path: 'configuracoes', element: <Navigate to="/desenvolvedores" replace /> },
                    {
                        path: 'modelos',
                        lazy: () => import('./routes/painel/modelos').then((m) => ({ Component: m.default })),
                    },
                    {
                        path: 'modelos/novo',
                        lazy: () =>
                            import('./routes/painel/modelo-novo').then((m) => ({ Component: m.default })),
                    },
                    {
                        path: 'modelos/:id',
                        lazy: () => import('./routes/painel/modelo').then((m) => ({ Component: m.default })),
                    },
                ],
            },
            { path: 's/:token', lazy: () => import('./routes/sign').then((m) => ({ Component: m.default })) },
            { path: 'v', lazy: () => import('./routes/verify').then((m) => ({ Component: m.default })) },
            {
                path: 'v/:code',
                lazy: () => import('./routes/verify-code').then((m) => ({ Component: m.default })),
            },
            { path: '*', lazy: () => import('./routes/not-found').then((m) => ({ Component: m.default })) },
        ],
    },
])
