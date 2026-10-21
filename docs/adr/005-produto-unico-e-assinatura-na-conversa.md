# ADR 005 · Um produto só, com a assinatura dentro da conversa

**Status:** aceita (substitui a ADR 004)

## Contexto

O feedback da LíderHub sobre a primeira versão: "só gerar um link não basta". O público (por exemplo, uma senhora que pede o BPC) não sabe abrir link, e hoje só cerca de 10% dos contratos enviados por link avulso fecham. A primeira versão também era outro sistema, com ativação, chave de parceiro, link de entrada e painel próprio: a LíderHub quer tudo nativo, num produto só.

## Decisão

- **Um produto só.** O repositório vira o módulo de contratos da LíderHub: Caixa de entrada, Contratos (com funil), Modelos, Configurações e Assistente. Saem a simulação separada da LíderHub, a ativação, a entrada por link de uso único, a página de desenvolvedores e os webhooks entre os dois sistemas. A chave de serviço continua só para o MCP e integrações de servidor.
- **Assinar na conversa.** Uma máquina de estados por envelope conduz a conversa: CPF digitado, PDF, resumo em áudio e botões interativos do WhatsApp (Assinar, Tenho uma dúvida, Ver no navegador). O aceite vale só pelo botão.
- **O mesmo motor para a demo e para produção.** O celular simulado e o webhook da Meta chamam o mesmo `ConversationService`. O simulador só existe com `DEMO_MODE`.
- **O link é plano B** e pede o CPF de novo no navegador, para um link encaminhado não assinar sozinho.
- **Funil e lembretes** viram parte do produto: o lembrete é na conversa e depende da etapa em que a pessoa parou.

## Consequências

- Menos passos para o cliente e para o escritório; o funil mostra onde cada pessoa para.
- A prova muda de natureza: em vez de IP e dispositivo, entram a posse do número, o CPF conferido e o id da mensagem do aceite. Precisa de validação jurídica antes do uso com clientes.
- Em produção, a primeira mensagem fora da janela de 24 h exige modelo aprovado pela Meta.
- A entrada sem senha da demonstração fica restrita ao computador local; o túnel público serve só para o link e a verificação.
