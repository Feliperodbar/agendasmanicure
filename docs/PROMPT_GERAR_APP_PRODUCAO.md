# Prompt atualizado — gerar o app de produção (colar na ferramenta de geração de código)

> Cole o texto do bloco abaixo na ferramenta (Bolt, Lovable, Cursor, v0 etc.).
> Ele já traz TODAS as decisões validadas no protótipo: valores reais, login por PIN,
> regras 24h/50%/10 min, calendário verde/laranja, telefone de 11 dígitos e a chave Pix.
> Substitui o prompt antigo de 29/10, que estava desatualizado.

```
Você é um desenvolvedor full-stack sênior. Crie um aplicativo COMPLETO e FUNCIONAL de agendamento para MANICURE AUTÔNOMA (profissional solo — NÃO é salão, NÃO tem equipe, NÃO é marketplace), mobile first, em Português do Brasil, fuso America/Sao_Paulo em tudo.

NEGÓCIO: "Natália Marcela | Nail designer" (Instagram @nataliamarcelanail).

## STACK (obrigatória)
- Next.js (App Router) + TypeScript + Tailwind CSS, pronto para deploy na Vercel, instalável como PWA.
- Banco: Supabase (Postgres) que JÁ EXISTE. Use EXATAMENTE as tabelas dos scripts em supabase/migrations/ deste repositório (001_schema.sql): clientes, servicos, configuracoes, agendamentos, bloqueios, admin_auth, sessoes, lista_espera, notificacoes. NÃO crie outras tabelas nem mude as colunas.
- Variáveis de ambiente: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
- REGRA DE SEGURANÇA INEGOCIÁVEL: a SUPABASE_SERVICE_ROLE_KEY roda SÓ no servidor (Server Actions / Route Handlers). Todo acesso ao banco passa pelo servidor, que confere nome+WhatsApp da cliente ou a sessão da manicure. Nada de service_role no navegador.

## VISUAL
- Minimalista e "cara de celular": coluna do app com no máximo 430px, listas simples com divisórias, sem sombras pesadas, alvos de toque de no mínimo 48px.
- Cor principal: rosa pastel #F7C4D0 (botões e destaques) com TEXTO ESCURO sobre ela; detalhes/pequenos textos em vinho #A82647; fundo claro fixo, ALTO CONTRASTE, sem modo escuro automático.
- Fontes: Jost em títulos, preços e números de destaque; Nunito Sans no restante.
- Navegação inferior FIXA com ícones e rótulos curtos. Cliente: Agendar / Meus horários / Regras. Manicure: Agenda / Serviços / Bloqueios / Horários / Regras.

## CATÁLOGO INICIAL (já está no banco pelo script 003; não duplicar)
Alongamento Molde F1 R$ 130 (120 min) · Banho de Gel R$ 100 (90 min) · Manutenção R$ 95 (60 min) · Gel no Pé R$ 65 (60 min) · Esmaltação em Gel R$ 60 (60 min). Preços e durações são editáveis pela manicure no admin.

## LADO DA CLIENTE (sem login)
1. Catálogo de serviços com nome, preço e duração.
2. Agendar em 3 passos: serviço → dia e hora livres → confirmar com nome + WhatsApp.
3. Disponibilidade calculada no servidor em tempo real: respeita horário de funcionamento por dia da semana, duração do serviço, buffer de 10 min entre atendimentos e bloqueios. Horário ocupado SOME para as outras clientes (anti-double-booking verificado no servidor ao confirmar).
4. Telefone/WhatsApp: SOMENTE celular brasileiro válido — 11 dígitos, máscara automática (DD) 9XXXX-XXXX, aceita colar com +55 e normaliza, DDD válido (11–99), 9 depois do DDD, botões desabilitados até validar e mensagens de erro específicas ("Faltam X dígitos" etc.). A mesma validação vale no servidor e em TODOS os campos de telefone do app.
5. Tela de confirmação: código do agendamento (NM-0001, gerado pelo banco), resumo e a frase do sinal com o valor calculado na hora (50% do serviço): "Para garantir o horário, o pagamento antecipado é de 50%: R$ XX — Enviar o pix para a chave: nataliamarcela49@gmail.com", com a parte do Pix em destaque. O app NÃO cobra o Pix: só mostra valor e chave.
6. "Meus horários": a cliente informa nome + WhatsApp e vê SÓ os próprios agendamentos (nome e telefone precisam bater exatamente). Pode cancelar e remarcar pelas regras abaixo.
7. Lista de espera: quando não há vaga no dia, a cliente entra com nome + WhatsApp + período (manhã/tarde/qualquer).

## REGRAS (valores editáveis no admin a partir da tabela configuracoes)
- Sinal antecipado OBRIGATÓRIO de 50% do valor para garantir o horário. Agendamento nasce "pendente" (= aguardando o sinal); quando a manicure confirma o recebimento no admin, vira "confirmado".
- Remarcação pela cliente: mínimo de 24h de antecedência.
- Cancelamento com estorno do sinal: só com 24h ou mais de antecedência. Com menos de 24h: cancela, mas fica marcado "sem estorno" na tela e nas mensagens.
- Falta (não compareceu): sinal NÃO é estornado.
- Tolerância de atraso: 10 minutos; passou disso, a manicure pode cancelar sem estorno.
- Cancelar SEMPRE libera o horário na hora, em qualquer caso (estorno é outra questão), e a vaga é oferecida à lista de espera daquele dia/período.
- Aviso sazonal, exibido em destaque âmbar para a cliente nas regras, no fluxo de agendamento e no lembrete: "Atenção — novembro e dezembro: em caso de falta ou de cancelamento com menos de 24 horas de antecedência, o pagamento antecipado não será estornado."
- Preço/duração congelados no agendamento (preco_snapshot/duracao_snapshot): mudar o serviço depois não altera quem já agendou.

## LADO DA MANICURE (login por PIN)
- Aba "Sou a manicure" protegida por PIN de 4 dígitos (só números, teclado numérico mobile).
- Primeiro acesso: ela DEFINE o PIN (digitar + confirmar); o servidor guarda apenas o hash (bcrypt) em admin_auth.pin_hash. PIN nunca em texto puro.
- 5 tentativas erradas seguidas bloqueiam novas tentativas por 5 minutos.
- Login cria sessão de 30 dias naquele aparelho (cookie httpOnly; token guardado como hash em sessoes). Botão Sair revoga a sessão no servidor. Trocar o PIN (em Horários, confirmando o PIN atual) revoga a sessão antiga.
- SEM login, nenhuma ação de admin funciona — nem chamando o servidor direto.
- Agenda: lista do dia + CALENDÁRIO MENSAL completo (mês/ano em pt-BR, setas de navegação). Dia com agendamentos ativos fica VERDE quando todos estão com o sinal ok; se houver PELO MENOS UM sem o sinal (pendente), o dia fica LARANJA, com prioridade sobre o verde, mostrando a contagem total e quantos estão sem sinal. Dia só com cancelados NÃO ganha cor. Legenda abaixo do calendário. Na lista do dia, agendamento pendente tem o selo laranja "Sem sinal". Tocar num dia abre a lista daquele dia. Marcador de "hoje" e contorno no dia selecionado.
- Ações por agendamento: confirmar, concluir, marcar falta, cancelar, remarcar (a manicure pode remarcar qualquer um, como exceção à regra das 24h), agendamento manual e EXCLUIR. Excluir e excluir serviço usam PAINEL de confirmação dentro da própria página (NUNCA window.confirm/alert/prompt, que não abrem dentro de apps embarcados) e mostram sucesso/erro na tela.
- Serviços: criar, editar (nome, preço, duração, descrição) e excluir.
- Bloqueios: bloquear dia inteiro ou intervalo, com motivo; bloqueio zera os horários daquele período.
- Horários/Configurações: horários por dia da semana, buffer, antecedência de estorno e de remarcação (horas), percentual do sinal, tolerância de atraso, chave Pix, nome de exibição e troca do PIN.
- Regras: aba com as regras em linguagem simples, formato Gatilho / Condições / Ações / Responsável.
- Notificações: ao criar/cancelar/remarcar, registrar em notificacoes as mensagens de confirmação e os lembretes (24h antes por WhatsApp/SMS/e-mail; 2h antes por WhatsApp) com status SIMULADO — nenhum provedor real está conectado; deixe isso identificado na interface.
- Exportar agendamentos em CSV e uma "sincronização" com Google Agenda/CRM simulada e idempotente (id_externo_sync por código NM; sincronizar de novo não duplica), identificada como simulada.

## CRITÉRIOS DE ACEITE (o app só está pronto se TODOS passarem)
1. Cliente agenda em 3 passos pelo celular e recebe código NM-####.
2. Segunda cliente no mesmo horário é recusada (conflito/buffer).
3. Cancelar libera o horário e oferece a vaga à lista de espera.
4. Telefone com mais ou menos de 11 dígitos é recusado no cliente E no servidor.
5. Sem o PIN, o admin não abre e as ações de admin são recusadas pelo servidor.
6. Calendário: dia com pendente fica laranja; dia só com confirmados, verde; cancelado não colore.
7. Frase do Pix mostra o valor certo de 50% do serviço escolhido e a chave nataliamarcela49@gmail.com.
8. Serviço de 120 min às 17:00 (fecha 18:00) é recusado por não caber; domingo fechado não oferece horários.

NÃO inclua: cobrança real de Pix, envio real de WhatsApp/SMS/e-mail, login da cliente, escolha de profissional, marketplace. Tudo isso está fora do escopo — notificações e sincronização são simuladas e identificadas como tal.
```
