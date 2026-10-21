import * as React from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { cn, useDocumentTitle } from '@lidersign/ui'

import { useOffice } from '@/features/office'

import { useContacts, useConversation } from '../hooks'
import { ChatView } from './chat-view'
import { ContactPanel, type PanelTab } from './contact-panel'
import { ConversationList } from './conversation-list'
import { SendContractDialog } from './send-contract-dialog'

export function InboxPage() {
    useDocumentTitle('Caixa de entrada')
    const office = useOffice()
    const [params, setParams] = useSearchParams()
    const contacts = useContacts()
    const requested = params.get('contato')
    const selectedId =
        requested ?? contacts.data?.find((item) => item.id === 'maria')?.id ?? contacts.data?.[0]?.id ?? null
    const contact = contacts.data?.find((item) => item.id === selectedId)
    const officeView = useConversation(selectedId, 'office')
    const client = useConversation(selectedId, 'client')
    const [tab, setTab] = React.useState<PanelTab>('contato')
    const [sendOpen, setSendOpen] = React.useState(false)
    const [mobile, setMobile] = React.useState<'list' | 'chat' | 'panel'>(requested ? 'chat' : 'list')

    function select(id: string) {
        setParams({ contato: id }, { replace: true })
        setMobile('chat')
    }

    function openPhone() {
        setTab('celular')
        setMobile('panel')
    }

    return (
        <div className="@container h-full min-h-0">
            <div className="grid h-full min-h-0 @3xl:grid-cols-[280px_minmax(0,1fr)] @min-[960px]:grid-cols-[280px_minmax(0,1fr)_360px]">
                <div
                    className={cn(
                        'min-h-0 min-w-0 grid-cols-1',
                        mobile === 'list' ? 'grid' : 'hidden',
                        '@3xl:grid',
                    )}
                >
                    <ConversationList
                        contacts={contacts.data}
                        loading={contacts.loading}
                        selected={selectedId}
                        onSelect={select}
                    />
                </div>
                <div
                    className={cn(
                        'min-h-0 min-w-0 grid-cols-1',
                        mobile === 'chat' ? 'grid' : 'hidden',
                        '@3xl:grid',
                    )}
                >
                    <ChatView
                        contact={contact}
                        messages={officeView.data?.messages}
                        loading={officeView.loading}
                        onSendContract={() => setSendOpen(true)}
                        onOpenPhone={openPhone}
                        onOpenPanel={() => {
                            setTab('contato')
                            setMobile('panel')
                        }}
                        onBack={() => setMobile('list')}
                    />
                </div>
                <div
                    className={cn(
                        'min-h-0 min-w-0 grid-cols-1',
                        mobile === 'panel'
                            ? 'fixed inset-0 z-40 grid bg-white @3xl:left-auto @3xl:w-[380px] @3xl:shadow-[-12px_0_32px_rgba(11,18,32,0.08)]'
                            : 'hidden',
                        '@min-[960px]:static @min-[960px]:z-auto @min-[960px]:grid @min-[960px]:w-auto @min-[960px]:shadow-none',
                    )}
                >
                    <ContactPanel
                        contact={contact}
                        officeName={office.tenant.name}
                        clientMessages={client.data?.messages}
                        clientLoading={client.loading}
                        tab={tab}
                        onTab={setTab}
                        onSendContract={() => setSendOpen(true)}
                        onClose={mobile === 'panel' ? () => setMobile('chat') : undefined}
                        closeClassName="@min-[960px]:hidden"
                    />
                </div>
                {contact ? (
                    <SendContractDialog
                        contact={contact}
                        open={sendOpen}
                        onOpenChange={setSendOpen}
                        onSent={() => {
                            toast.success('Contrato enviado na conversa', {
                                description: 'Veja no celular do cliente como ele recebe.',
                            })
                            void contacts.reload()
                            setTab('celular')
                        }}
                    />
                ) : null}
            </div>
        </div>
    )
}
