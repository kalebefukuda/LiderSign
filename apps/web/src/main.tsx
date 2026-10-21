import '@fontsource-variable/inter'
import './styles.css'

import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { configureDocumentTitle, configureHttp } from '@lidersign/ui'

import { router } from './router'

configureDocumentTitle({
    suffix: 'LíderSign',
    fallback: 'LíderSign · Assinatura eletrônica nativa da LíderHub',
})
configureHttp({ headers: { 'X-LiderSign-Client': 'web' } })

const container = document.getElementById('root')
if (!container) throw new Error('Elemento #root não encontrado')

createRoot(container).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>,
)
