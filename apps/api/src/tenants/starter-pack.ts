import type { CreateTemplateInput } from '@lidersign/shared'

/**
 * Modelos de exemplo criados no "Ativar LíderSign": o escritório já começa com o que mais assina.
 * Textos fictícios e genéricos, para revisão do advogado responsável.
 */
export const STARTER_TEMPLATES: CreateTemplateInput[] = [
    {
        name: 'Contrato de honorários · BPC/LOAS',
        kind: 'CONTRATO',
        assuranceLevel: 'PADRAO',
        body: `# Contrato de prestação de serviços advocatícios

**Modelo de exemplo do LíderSign: revise com o advogado responsável antes de usar.**

Pelo presente instrumento particular, de um lado **{{nome_cliente}}**, inscrito(a) no CPF sob o nº {{cpf_cliente}}, residente em {{endereco_cliente}}, doravante denominado(a) **CONTRATANTE**, e de outro lado **{{nome_escritorio}}**, neste ato representado por {{nome_advogado}}, inscrito(a) na {{oab_advogado}}, doravante denominado **CONTRATADO**, têm entre si justo e contratado o seguinte.

## Cláusula 1ª · Do objeto

O CONTRATADO prestará serviços advocatícios ao CONTRATANTE para requerer, nas vias administrativa e judicial, o Benefício de Prestação Continuada (BPC) previsto na Lei nº 8.742/1993 (Lei Orgânica da Assistência Social), acompanhando o pedido até a decisão final.

## Cláusula 2ª · Das obrigações do contratado

- Orientar o CONTRATANTE sobre os documentos necessários e sobre cada etapa do pedido.
- Protocolar e acompanhar o requerimento, mantendo o CONTRATANTE informado pelo WhatsApp.
- Agir com zelo, sigilo e lealdade, conforme o Código de Ética e Disciplina da advocacia.

## Cláusula 3ª · Das obrigações do contratante

- Fornecer documentos e informações verdadeiros e completos.
- Comparecer a perícias, avaliações sociais e audiências sempre que convocado.
- Avisar o CONTRATADO sobre qualquer mudança de endereço, telefone ou renda da família.

## Cláusula 4ª · Dos honorários

Em caso de êxito, o CONTRATANTE pagará ao CONTRATADO honorários de **{{percentual_honorarios}}** sobre os valores atrasados recebidos. Não havendo êxito, nada será devido a título de honorários.

## Cláusula 5ª · Da vigência e da rescisão

Este contrato vale até a conclusão do pedido e pode ser rescindido por qualquer das partes mediante aviso por escrito, garantidos os honorários proporcionais ao trabalho já realizado.

## Cláusula 6ª · Da assinatura eletrônica

As partes reconhecem a validade da assinatura eletrônica deste contrato, feita pela plataforma LíderSign, com link pessoal enviado ao WhatsApp do CONTRATANTE, confirmação do seu CPF e registro de data, hora e endereço IP.

## Cláusula 7ª · Do foro

Fica eleito o foro da comarca de {{cidade}} para resolver eventuais dúvidas sobre este contrato.

{{cidade}}, {{data}}.`,
        variables: [
            { key: 'nome_cliente', label: 'Nome do cliente', type: 'text', example: 'Maria Aparecida dos Santos' },
            { key: 'cpf_cliente', label: 'CPF do cliente', type: 'cpf', example: '529.982.247-25' },
            {
                key: 'endereco_cliente',
                label: 'Endereço do cliente',
                type: 'address',
                example: 'Rua das Palmeiras, 120, Centro, Joinville/SC',
            },
            {
                key: 'nome_escritorio',
                label: 'Nome do escritório',
                type: 'text',
                example: 'Souza Advocacia Previdenciária',
            },
            { key: 'nome_advogado', label: 'Advogado responsável', type: 'text', example: 'Dra. Ana Paula Souza' },
            { key: 'oab_advogado', label: 'OAB do advogado', type: 'text', example: 'OAB/SC 00000' },
            { key: 'percentual_honorarios', label: 'Percentual de honorários', type: 'text', example: '30%' },
            { key: 'cidade', label: 'Cidade', type: 'text', example: 'Joinville/SC' },
            { key: 'data', label: 'Data', type: 'date', example: '20 de outubro de 2026' },
        ],
    },
    {
        name: 'Procuração ad judicia et extra',
        kind: 'PROCURACAO',
        assuranceLevel: 'REFORCADO',
        body: `# Procuração ad judicia et extra

**Modelo de exemplo do LíderSign: revise com o advogado responsável antes de usar.**

**OUTORGANTE:** {{nome_cliente}}, {{nacionalidade}}, {{estado_civil}}, {{profissao}}, inscrito(a) no CPF sob o nº {{cpf_cliente}}, residente em {{endereco_cliente}}.

**OUTORGADO(A):** {{nome_advogado}}, advogado(a) inscrito(a) na {{oab_advogado}}, com escritório em {{endereco_escritorio}}.

## Poderes

Pelo presente instrumento, o(a) OUTORGANTE nomeia e constitui o(a) OUTORGADO(A) seu(sua) procurador(a), com os poderes da cláusula ad judicia et extra para o foro em geral, podendo propor ações, apresentar defesas, recorrer, transigir, desistir, receber e dar quitação, firmar compromissos e praticar todos os atos necessários ao fiel cumprimento deste mandato, inclusive substabelecer, com ou sem reserva de poderes.

## Finalidade

Esta procuração é outorgada especialmente para a seguinte finalidade: {{finalidade}}

## Declaração do outorgante

O(A) OUTORGANTE declara que leu esta procuração, que confirmou sua identidade por código enviado ao seu WhatsApp e por selfie, e que concorda com a outorga destes poderes.

{{cidade}}, {{data}}.`,
        variables: [
            { key: 'nome_cliente', label: 'Nome do outorgante', type: 'text', example: 'Maria Aparecida dos Santos' },
            { key: 'nacionalidade', label: 'Nacionalidade', type: 'text', example: 'brasileira' },
            { key: 'estado_civil', label: 'Estado civil', type: 'text', example: 'viúva' },
            { key: 'profissao', label: 'Profissão', type: 'text', example: 'do lar' },
            { key: 'cpf_cliente', label: 'CPF do outorgante', type: 'cpf', example: '529.982.247-25' },
            {
                key: 'endereco_cliente',
                label: 'Endereço do outorgante',
                type: 'address',
                example: 'Rua das Palmeiras, 120, Centro, Joinville/SC',
            },
            { key: 'nome_advogado', label: 'Advogado(a) outorgado(a)', type: 'text', example: 'Dra. Ana Paula Souza' },
            { key: 'oab_advogado', label: 'OAB do advogado', type: 'text', example: 'OAB/SC 00000' },
            {
                key: 'endereco_escritorio',
                label: 'Endereço do escritório',
                type: 'address',
                example: 'Av. Getúlio Vargas, 500, sala 12, Joinville/SC',
            },
            {
                key: 'finalidade',
                label: 'Finalidade',
                type: 'text',
                example:
                    'Requerer o Benefício de Prestação Continuada (BPC/LOAS) junto ao INSS e, se necessário, propor a ação judicial correspondente.',
            },
            { key: 'cidade', label: 'Cidade', type: 'text', example: 'Joinville/SC' },
            { key: 'data', label: 'Data', type: 'date', example: '20 de outubro de 2026' },
        ],
    },
]
