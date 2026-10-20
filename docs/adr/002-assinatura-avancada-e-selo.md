# ADR 002 · Assinatura avançada com selo da plataforma e dossiê para o juiz

**Status:** aceita

## Contexto

O problema citado pela LíderHub é que alguns tribunais não aceitam assinaturas feitas em assinadores privados. A pesquisa mostrou que a lei aceita assinatura fora da ICP-Brasil (MP 2.200-2/2001, art. 10, §2º; Lei 14.063/2020). O STJ também aceitou procuração eletrônica sem ICP-Brasil quando há mecanismos confiáveis de autoria e integridade (REsp 2.223.695).

A recusa aparece sobretudo em procurações de litígio de massa, onde a Recomendação CNJ 159/2024 lista a "assinatura eletrônica não qualificada" como indício de abuso e autoriza o juiz a pedir perícia ou comparecimento.

## Decisão

- **Assinatura eletrônica avançada** como padrão, com prova forte de autoria: código de 6 dígitos no WhatsApp (posse do telefone), IP, dispositivo, geolocalização consentida e aceite expresso.
- **Dois níveis de garantia por modelo:** Padrão e Reforçado (+ selfie). Procurações já nascem como Reforçado.
- **Selo da plataforma** (PAdES, `ETSI.CAdES.detached`) sobre o PDF final. Qualquer byte alterado invalida o selo.
- **Carimbo do tempo RFC 3161** sobre o SHA-256 do original.
- **Página de evidências** legível por um juiz, com QR e código de verificação pública.
- **Trilha de auditoria** append-only com hash encadeado.

## Consequências

- O juiz confere a autenticidade sem depender do assinador: pelo código, pelo QR ou enviando o arquivo.
- O certificado da demonstração é autoassinado: o Adobe mostra "identidade desconhecida". Em produção, usar e-CNPJ e carimbo de uma ACT credenciada na ICP-Brasil.
- Próximos passos: Pix de R$ 0,01 e biometria (Datavalid) no nível Reforçado; assinatura gov.br e ICP-Brasil como nível Máximo.
