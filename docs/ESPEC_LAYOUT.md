# Especificação de layout — replicar o protótipo EXATAMENTE

> Use junto com o `PROMPT_GERAR_APP_PRODUCAO.md`: cole os dois na ferramenta de geração
> e anexe prints das telas do protótipo como referência visual.
> Objetivo: a versão de produção deve ser visualmente idêntica ao protótipo validado.

## 1. Base global (todas as telas)

- App pensado para celular: coluna central de no máximo **430px**, fundo claro fixo (branco/quase branco), **sem modo escuro automático**.
- Cor principal: **rosa pastel `#F7C4D0`** — botões primários e destaques, sempre com **texto escuro** em cima (nunca texto branco sobre o rosa).
- Cor de apoio para textos pequenos/detalhes sobre fundo branco: **vinho `#A82647`**.
- Texto principal quase preto (`#221116`); textos secundários em vinho-acinzentado escuro (`#63414A`) — nada de cinza claro ilegível.
- Fontes: **Jost** (títulos, preços, códigos e números de destaque) e **Nunito Sans** (todo o resto: textos, botões, campos, listas).
- Estilo minimalista: **sem sombras**, sem cartões empilhados com bordas grossas; seções separadas por **linhas divisórias simples**.
- Alvos de toque de no mínimo **48px** de altura. Campos e botões com cantos arredondados (~12px; botões primários em formato de pílula).
- **Navegação inferior fixa** em todas as telas, com ícone + rótulo curto:
  - Cliente: **Agendar · Meus horários · Regras**
  - Manicure: **Agenda · Serviços · Bloqueios · Horários · Regras**
- No topo, alternância entre os dois lados: **"Cliente" | "Sou a manicure"**.

## 2. Cabeçalho

- Avatar circular rosa à esquerda + título **"Natália Marcela | Nail designer"** em Jost (~22px, sem cortar o texto) e o `@nataliamarcelanail` pequeno embaixo.

## 3. Telas da cliente

### Agendar
- No topo, a caixa de aviso em **destaque âmbar**: "Atenção — novembro e dezembro: em caso de falta ou de cancelamento com menos de 24 horas de antecedência, o pagamento antecipado não será estornado."
- Lista de serviços em linhas simples (divisórias, sem cartões): nome do serviço, duração pequena embaixo, **preço em Jost** à direita e botão **"Agendar"** em pílula rosa com texto preto (igual ao botão de referência do protótipo).
- Fluxo em 3 passos com indicador de etapas: **1 Serviço → 2 Dia e hora → 3 Confirmar**.
- Dia e hora: grade de horários em botões (chips); indisponível em tom legível riscado/apagado; selecionado com destaque forte (anel escuro).
- Confirmação: campos Nome e WhatsApp — WhatsApp com máscara automática `(DD) 9XXXX-XXXX`, contador "n/11" e erros específicos embaixo do campo (borda vermelha quando inválido). Botão **Confirmar fixo logo acima da navegação inferior**, largura total.
- Tela de sucesso **"Pedido enviado!"**: código **NM-####** grande em Jost, resumo do agendamento e a frase do sinal com o valor calculado, com a parte **"Enviar o pix para a chave: nataliamarcela49@gmail.com"** em destaque (negrito, vinho sobre fundo suave, quebrando a linha se precisar).

### Meus horários
- Dois campos (nome + WhatsApp) e botão de busca. Abaixo, a lista SÓ dos agendamentos dela: linhas com data/hora, serviço, preço e **selo de status colorido**; botões Cancelar e Remarcar em cada um; aviso de "sem estorno" aparece ao cancelar com menos de 24h.

### Regras (cliente)
- Cartão-resumo das regras em linguagem simples: sinal de 50%, 24h para estorno/remarcação, tolerância de 10 min, e a caixa âmbar do aviso de novembro/dezembro.

## 4. Login da manicure

- Tela simples e centrada: 4 bolinhas do PIN preenchendo conforme digita e **teclado numérico** grande na própria página.
- Primeiro acesso: "defina seu PIN" + confirmar. Erros mostram quantas tentativas restam; bloqueio mostra o tempo de espera.

## 5. Telas da manicure

### Agenda
- **Calendário mensal** no topo: cabeçalho "novembro de 2026" em português com setas ‹ ›; semana começando no domingo; célula com número do dia e, quando houver, a **quantidade** de agendamentos.
  - Dia com agendamentos e **todos com sinal ok: fundo VERDE** (esmeralda) com texto branco.
  - Dia com **pelo menos um sem o sinal de 50%: fundo LARANJA** (prioridade sobre o verde), com a contagem de quantos estão sem sinal.
  - Dia só com cancelados: **sem cor**. Hoje: pontinho marcador. Dia selecionado: **anel escuro interno** (diferente das cores).
- **Legenda** curta embaixo do calendário, texto escuro: verde = "com agendamentos (sinal ok)"; laranja = "agendamento sem o sinal de 50%".
- Abaixo, a lista do dia selecionado: cada agendamento em linha/bloco com hora, duração, **nome da cliente + código NM-####**, serviço e preço, telefone, selo de status, **selo laranja "Sem sinal"** quando pendente, e a linha de ações: WhatsApp, Confirmar, Concluir, Falta, Cancelar, Remarcar e **Excluir em vermelho sólido**.
- Confirmações destrutivas (excluir agendamento/serviço, cancelar) acontecem num **painel dentro da própria página**, com os dados do item e botões grandes "Sim, excluir" / "Voltar" — nunca `window.confirm`.

### Serviços
- Lista em linhas: nome, duração e preço em Jost; editar inline/expansível; excluir em vermelho com o painel de confirmação; botão de adicionar serviço no topo/fim.

### Bloqueios
- Formulário enxuto (data, dia todo ou intervalo, motivo) e a lista de bloqueios existentes com excluir.

### Horários
- Uma linha por dia da semana: abre/fecha com campos de hora e opção "fechado".
- Campos numéricos das regras: antecedência de estorno (24h), de remarcação (24h), sinal (50%), buffer (10 min) e tolerância de atraso (10 min); chave Pix; nome de exibição; bloco de troca de PIN; botões de sincronização (simulada) e exportar CSV; acesso ao log de notificações.

### Regras (manicure)
- As mesmas regras da cliente + os modelos de mensagem, organizados no formato **Gatilho / Condições / Ações / Responsável**, incluindo o texto do aviso de novembro/dezembro.

## 6. Selos de status (cores consistentes no app inteiro)

- **Pendente** (aguardando o sinal): laranja/âmbar — combina com o selo "Sem sinal" e com o laranja do calendário.
- **Confirmado**: verde. **Concluído**: neutro/azul. **Cancelado**: vermelho claro. **Falta**: cinza/vinho.

## 7. O que NÃO mudar ao replicar

- Nada de modo escuro, nada de sombras/cartões pesados, nada de texto branco sobre o rosa pastel, nada de fonte diferente das duas acima, nada de navegação lateral ou no topo substituindo a barra inferior fixa.
