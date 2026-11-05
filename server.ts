import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import path from 'path';
import crypto from 'crypto';
import { memoryDb, hashPin, isUsingSupabase, supabaseClient, loadSupabaseConfig, saveSupabaseConfig, hydrateSupabaseData, waivePendingNovemberDeposits, getAgendamentoById, getClienteByWhatsApp, persistClienteOrThrow, listAgendamentosByCliente, listAgendamentosInRange, reservePixBooking, confirmPixBooking, expirePixBookings, findSupabaseSession, getSupabaseAdminAuth, getSupabaseAdminAuths, persistAdminAuth, persistSessao, persistManicure, persistServico, persistCliente, persistAgendamento, persistAgendamentoOrThrow, persistBloqueio, persistListaEspera, persistNotificacao, deleteSessao, deleteSessionByToken, deleteAllSessoes, deleteAgendamento, deleteBloqueio, Cliente, Servico, Bloqueio, Agendamento, Notificacao, Manicure, AdminAuth, Sessao } from './src/server/db.js';
import { validateWhatsApp } from './src/utils/phone.js';
import { calculateAvailableSlots, BusinessHoursMap } from './src/utils/slots.js';
import { calculateDeposit, checkRefundEligibility, computeDayCalendarColor, getDepositPercentageForDate } from './src/utils/rules.js';
import { getNowInSaoPaulo, toSaoPauloISO, formatInSaoPaulo } from './src/utils/timezone.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);
declare global {
  namespace Express {
    interface Request {
      adminSession?: Sessao;
    }
  }
}

app.use(express.json());
app.use(cookieParser());

let configInitialization: Promise<void> | null = null;
function ensureConfigLoaded(): Promise<void> {
  if (!configInitialization) {
    configInitialization = loadSupabaseConfig()
      .then(() => hydrateSupabaseData())
      .then(() => waivePendingNovemberDeposits())
      .catch((error) => {
        console.error(error);
      });
  }
  return configInitialization;
}

app.use((_req, _res, next) => {
  ensureConfigLoaded().then(() => next());
});

// -------------------------------------------------------------
// Middleware de Autenticação do Admin (PIN / Sessão)
// -------------------------------------------------------------
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.nm_session || req.headers['authorization']?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado. Efetue login com seu PIN.' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const sessao = memoryDb.sessoes.get(tokenHash) || await findSupabaseSession(tokenHash);

  if (!sessao || new Date(sessao.expira_em) < new Date()) {
    if (sessao) {
      memoryDb.sessoes.delete(tokenHash);
      void deleteSessao(sessao.id);
    }
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }

  req.adminSession = sessao;
  next();
}

function adminManicureId(req: Request): string | null {
  return req.adminSession?.manicure_id || null;
}

function isInAdminScope(req: Request, manicureId?: string | null): boolean {
  const scope = adminManicureId(req);
  return !scope || manicureId === scope;
}

async function getAdminAgendamentosInRange(
  req: Request,
  startISO: string,
  endISO: string,
): Promise<Agendamento[]> {
  const currentBookings = await listAgendamentosInRange(startISO, endISO, adminManicureId(req));
  if (currentBookings) return currentBookings;

  return Array.from(memoryDb.agendamentos.values())
    .filter((booking) =>
      isInAdminScope(req, booking.manicure_id) &&
      new Date(booking.data_hora_inicio) >= new Date(startISO) &&
      new Date(booking.data_hora_inicio) < new Date(endISO)
    );
}

function requireOwner(req: Request, res: Response): boolean {
  if (adminManicureId(req)) {
    res.status(403).json({ error: 'Somente o proprietário pode gerenciar as manicures.' });
    return false;
  }
  return true;
}

// Checar sessão sem disparar 401
app.get('/api/admin/session', async (req, res) => {
  const token = req.cookies?.nm_session || req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.json({ isLoggedIn: false });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const sessao = memoryDb.sessoes.get(tokenHash) || await findSupabaseSession(tokenHash);
  if (!sessao || new Date(sessao.expira_em) < new Date()) {
    return res.json({ isLoggedIn: false });
  }
  res.json({ isLoggedIn: true, isOwner: !sessao.manicure_id });
});

// -------------------------------------------------------------
// 1. ROTAS PÚBLICAS DO CLIENTE
// -------------------------------------------------------------

// Perfis públicos das manicures ativas
function toPublicManicure(m: Manicure) {
  return { id: m.id, slug: m.slug, name: m.name, instagram: m.instagram, photo_url: m.photo_url, active: m.active };
}

function resolveManicure(req: Request): Manicure | null {
  const slug = typeof req.query.manicure === 'string' ? req.query.manicure : 'natalia';
  return Array.from(memoryDb.manicures.values()).find((item) => item.active && item.slug === slug) || null;
}

function configValue(req: Request, chave: string, fallback: unknown): unknown {
  const manicure = resolveManicure(req);
  const scoped = manicure ? memoryDb.configuracoes.get(`${manicure.id}:${chave}`) : undefined;
  return scoped?.valor ?? memoryDb.configuracoes.get(chave)?.valor ?? fallback;
}

app.get('/api/manicures', (_req, res) => {
  const manicures = Array.from(memoryDb.manicures.values())
    .filter((m) => m.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map(toPublicManicure);
  res.json(manicures);
});

app.get('/api/manicures/:slug', (req, res) => {
  const manicure = Array.from(memoryDb.manicures.values())
    .find((m) => m.active && m.slug === req.params.slug);
  if (!manicure) {
    return res.status(404).json({ error: 'Manicure não encontrada.' });
  }
  res.json(toPublicManicure(manicure));
});

function slugifyManicure(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

app.get('/api/admin/manicures', requireAdmin, (req, res) => {
  if (!requireOwner(req, res)) return;
  const scope = adminManicureId(req);
  res.json(Array.from(memoryDb.manicures.values())
    .filter((item) => !scope || item.id === scope)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
});

app.post('/api/admin/manicures', requireAdmin, async (req, res) => {
  try {
    if (!requireOwner(req, res)) return;
    const { name, slug, instagram, photo_url, pin } = req.body as {
      name?: string;
      slug?: string;
      instagram?: string;
      photo_url?: string;
      pin?: string;
    };
    const normalizedName = String(name || '').trim();
    const normalizedSlug = slugifyManicure(String(slug || normalizedName));
    if (normalizedName.length < 3 || !normalizedSlug || !/^\d{4}$/.test(pin || '')) {
      return res.status(400).json({ error: 'Nome, slug e PIN de 4 números são obrigatórios.' });
    }
    if (Array.from(memoryDb.manicures.values()).some((item) => item.slug === normalizedSlug)) {
      return res.status(409).json({ error: 'Este slug já está em uso.' });
    }
    const pinHash = hashPin(pin!);
    const existingAuths = await getSupabaseAdminAuths();
    if (existingAuths.some((item) => item.pin_hash === pinHash) || memoryDb.adminAuth?.pin_hash === pinHash) {
      return res.status(409).json({ error: 'Este PIN já está em uso. Escolha outro.' });
    }

    const now = new Date().toISOString();
    const manicure: Manicure = {
      id: crypto.randomUUID(),
      slug: normalizedSlug,
      name: normalizedName,
      instagram: String(instagram || '').trim() || null,
      photo_url: String(photo_url || '').trim() || null,
      active: true,
      created_at: now,
      updated_at: now,
    };
    await persistManicure(manicure);
    memoryDb.manicures.set(manicure.id, manicure);
    const auth: AdminAuth = {
      id: crypto.randomUUID(),
      pin_hash: pinHash,
      tentativas_falhas: 0,
      bloqueado_ate: null,
      atualizado_em: now,
      manicure_id: manicure.id,
    };
    await persistAdminAuth(auth);
    memoryDb.adminAuths.set(auth.id, auth);
    const defaultServices = Array.from(memoryDb.servicos.values()).filter((service) =>
      !service.manicure_id || service.manicure_id === memoryDb.manicures.get('default-manicure')?.id
    );
    const copies = defaultServices.map((service) => ({
      ...service,
      id: crypto.randomUUID(),
      manicure_id: manicure.id,
      criado_em: now,
      atualizado_em: now,
    }));
    await Promise.all(copies.map(async (copy) => {
      memoryDb.servicos.set(copy.id, copy);
      await persistServico(copy);
    }));
    res.status(201).json(toPublicManicure(manicure));
  } catch (error) {
    console.error('Falha ao cadastrar manicure:', error);
    res.status(500).json({ error: 'Não foi possível cadastrar a manicure. Tente novamente.' });
  }
});

app.patch('/api/admin/manicures/:id', requireAdmin, async (req, res) => {
  if (!requireOwner(req, res)) return;
  const manicure = memoryDb.manicures.get(req.params.id);
  if (!manicure) return res.status(404).json({ error: 'Manicure não encontrada.' });
  const { name, slug, instagram, photo_url, active } = req.body as {
    name?: string; slug?: string; instagram?: string; photo_url?: string; active?: boolean;
  };
  const normalizedName = name === undefined ? manicure.name : String(name).trim();
  const normalizedSlug = slug === undefined ? manicure.slug : slugifyManicure(String(slug));
  if (normalizedName.length < 3 || !normalizedSlug) {
    return res.status(400).json({ error: 'Nome e slug válidos são obrigatórios.' });
  }
  const duplicate = Array.from(memoryDb.manicures.values())
    .some((item) => item.id !== manicure.id && item.slug === normalizedSlug);
  if (duplicate) return res.status(409).json({ error: 'Este slug já está em uso.' });
  manicure.name = normalizedName;
  manicure.slug = normalizedSlug;
  if (instagram !== undefined) manicure.instagram = String(instagram).trim() || null;
  if (photo_url !== undefined) manicure.photo_url = String(photo_url).trim() || null;
  if (active !== undefined) manicure.active = Boolean(active);
  manicure.updated_at = new Date().toISOString();
  await persistManicure(manicure);
  res.json(toPublicManicure(manicure));
});
// Catálogo de serviços ativos
app.get('/api/servicos', (req, res) => {
  const manicure = resolveManicure(req);
  if (!manicure) return res.status(404).json({ error: 'Manicure não encontrada.' });
  const servicos = Array.from(memoryDb.servicos.values())
    .filter((s) => s.ativo && (!s.manicure_id || s.manicure_id === manicure.id))
    .sort((a, b) => a.ordem - b.ordem);
  res.json(servicos);
});

// Configurações públicas (Chave Pix, percentual de sinal, etc.)
app.get('/api/configuracoes-publicas', (req, res) => {
  const chavePix = configValue(req, 'chave_pix', 'nataliamarcela49@gmail.com');
  const sinalPct = configValue(req, 'sinal_percentual', 50);
  const bufferMin = configValue(req, 'buffer_minutos', 10);
  const toleranciaAtraso = configValue(req, 'tolerancia_atraso_minutos', 10);
  res.json({ chavePix, sinalPct, bufferMin, toleranciaAtraso });
});

// Disponibilidade de horários em tempo real
app.get('/api/disponibilidade', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { data, servicoId } = req.query as { data?: string; servicoId?: string };
  if (!data || !servicoId) {
    return res.status(400).json({ error: 'Data e ID do serviço são obrigatórios.' });
  }

  const servico = memoryDb.servicos.get(servicoId);
  if (!servico) {
    return res.status(404).json({ error: 'Serviço não encontrado.' });
  }
  const manicure = resolveManicure(req);
  if (!manicure || (servico.manicure_id && servico.manicure_id !== manicure.id)) {
    return res.status(404).json({ error: 'Manicure ou serviço não encontrado.' });
  }

  const hoursConfig = configValue(req, 'horarios_funcionamento', undefined);
  const bufferMinutes = Number(configValue(req, 'buffer_minutos', 10));

  // Filtrar agendamentos e bloqueios da data
  const nextDate = new Date(`${data}T12:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  let dayBookings: Agendamento[];
  try {
    await expirePixBookings();
    dayBookings = await listAgendamentosInRange(
      toSaoPauloISO(data, '00:00'),
      toSaoPauloISO(nextDate.toISOString().slice(0, 10), '00:00'),
      manicure.id,
    ) || Array.from(memoryDb.agendamentos.values()).filter((booking) =>
      booking.data_hora_inicio.startsWith(data) &&
      (!booking.manicure_id || booking.manicure_id === manicure.id)
    );
  } catch (error) {
    console.error('Falha ao carregar disponibilidade atualizada:', error);
    return res.status(502).json({ error: 'Não foi possível verificar os horários disponíveis.' });
  }

  const dayBlocks = Array.from(memoryDb.bloqueios.values()).filter((b) =>
    (!b.manicure_id || b.manicure_id === manicure.id) &&
    (b.data_inicio.startsWith(data) || b.data_fim.startsWith(data) || b.dia_inteiro)
  );

  const slots = calculateAvailableSlots({
    dateStr: data,
    serviceDurationMinutes: servico.duracao_minutos,
    businessHours: hoursConfig as string | BusinessHoursMap | undefined,
    bufferMinutes,
    existingBookings: dayBookings,
    blocks: dayBlocks,
  });

  res.json({ slots });
});

// Criar Agendamento (3º Passo) com Anti-Double-Booking e snapshots
app.post('/api/agendamentos', async (req, res) => {
  const { servicoId, data, horario, nomeCliente, whatsappCliente, observacoes } = req.body;
  const manicure = resolveManicure(req);
  if (!manicure) return res.status(404).json({ error: 'Manicure não encontrada.' });

  // Validação de Celular Brasileiro
  const phoneVal = validateWhatsApp(whatsappCliente || '');
  if (!phoneVal.valid) {
    return res.status(400).json({ error: phoneVal.error });
  }

  const nome = (nomeCliente || '').trim();
  if (nome.length < 3) {
    return res.status(400).json({ error: 'Informe seu nome completo (mínimo de 3 caracteres).' });
  }

  const servico = memoryDb.servicos.get(servicoId);
  if (!servico || (servico.manicure_id && servico.manicure_id !== manicure.id)) {
    return res.status(404).json({ error: 'Serviço selecionado é inválido.' });
  }

  const sinalPct = getDepositPercentageForDate(data, Number(configValue(req, 'sinal_percentual', 50)));
  const bufferMin = Number(configValue(req, 'buffer_minutos', 10));
  const chavePix = String(configValue(req, 'chave_pix', 'nataliamarcela49@gmail.com'));

  const duracao = servico.duracao_minutos;
  const startISO = toSaoPauloISO(data, horario);

  // VALIDAÇÃO DE DATA E HORÁRIO PASSADOS
  if (new Date(startISO) <= new Date()) {
    return res.status(400).json({
      error: 'Não é possível agendar em uma data ou horário que já passou.',
    });
  }

  const [h, m] = horario.split(':').map(Number);
  const fimMinTotal = h * 60 + m + duracao;
  const endH = Math.floor(fimMinTotal / 60);
  const endM = fimMinTotal % 60;
  const endISO = toSaoPauloISO(data, `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);

  // ANTI-DOUBLE-BOOKING NO SERVIDOR
  const sStart = new Date(startISO).getTime();
  const sEndWithBuffer = new Date(endISO).getTime() + bufferMin * 60000;

  const hasConflict = Array.from(memoryDb.agendamentos.values()).some((a) => {
    if (
      a.status === 'cancelado' ||
      (a.pagamento_status === 'aguardando' && a.expires_at && new Date(a.expires_at).getTime() <= Date.now()) ||
      (a.manicure_id && a.manicure_id !== manicure.id)
    ) return false;
    const aStart = new Date(a.data_hora_inicio).getTime();
    const aEndWithBuffer = new Date(a.data_hora_fim).getTime() + bufferMin * 60000;
    return sStart < aEndWithBuffer && sEndWithBuffer > aStart;
  });

  if ((!supabaseClient || sinalPct === 0) && hasConflict) {
    return res.status(409).json({
      error: 'Este horário acabou de ser reservado por outra cliente. Por favor, escolha outro horário.',
    });
  }

  // Localiza ou cria cliente
  let cliente: Cliente | undefined;
  try {
    cliente = (await getClienteByWhatsApp(phoneVal.clean)) || undefined;
  } catch (error) {
    console.error('Falha ao localizar cliente para reserva:', error);
    return res.status(502).json({ error: 'Não foi possível preparar a reserva.' });
  }
  const now = new Date().toISOString();

  if (cliente) {
    cliente.nome = nome;
    cliente.atualizado_em = now;
  } else {
    cliente = {
      id: crypto.randomUUID(),
      nome,
      whatsapp: phoneVal.clean,
      criado_em: now,
      atualizado_em: now,
    };
  }
  try {
    await persistClienteOrThrow(cliente);
    memoryDb.clientes.set(cliente.id, cliente);
  } catch (error) {
    console.error('Falha ao salvar cliente para reserva:', error);
    return res.status(502).json({ error: 'Não foi possível salvar os dados da cliente.' });
  }

  // Gera código sequencial NM-0001
  memoryDb.seqCounter += 1;
  const codigo = `NM-${String(memoryDb.seqCounter).padStart(4, '0')}`;
  const valorSinal = calculateDeposit(servico.preco, sinalPct);

  const agendamentoId = crypto.randomUUID();
  const novoAgendamento: Agendamento = {
    id: agendamentoId,
    codigo,
    cliente_id: cliente.id,
    servico_id: servico.id,
    manicure_id: manicure.id,
    data_hora_inicio: startISO,
    data_hora_fim: endISO,
    duracao_snapshot: duracao,
    preco_snapshot: servico.preco,
    valor_sinal: valorSinal,
    status: sinalPct === 0 ? 'confirmado' : 'pendente',
    pagamento_status: sinalPct === 0 ? 'nao_requerido' : 'aguardando',
    expires_at: null,
    sinal_confirmado: sinalPct === 0,
    estorno_elegivel: true,
    observacoes,
    criado_em: now,
    atualizado_em: now,
  };

  if (sinalPct > 0) {
    try {
      const reservation = await reservePixBooking(novoAgendamento, bufferMin);
      if (!reservation.accepted || !reservation.expiresAt) {
        return res.status(409).json({
          error: 'Este horário acabou de ser reservado por outra cliente. Por favor, escolha outro horário.',
        });
      }
      novoAgendamento.expires_at = reservation.expiresAt;
      novoAgendamento.criado_em = new Date(
        Date.parse(reservation.expiresAt) - 20 * 60 * 1000,
      ).toISOString();
    } catch (error) {
      console.error('Falha ao criar reserva temporária Pix:', error);
      return res.status(502).json({ error: 'Não foi possível reservar o horário temporariamente.' });
    }
  } else {
    try {
      await persistAgendamentoOrThrow(novoAgendamento);
    } catch (error) {
      console.error('Falha ao salvar agendamento:', error);
      return res.status(502).json({ error: 'Não foi possível salvar o agendamento.' });
    }
  }

  memoryDb.agendamentos.set(agendamentoId, novoAgendamento);

  // Registra notificações simuladas
  const confirmationNotification: Notificacao = {
    id: crypto.randomUUID(),
    agendamento_id: agendamentoId,
    tipo: 'confirmacao_solicitada',
    canal: 'whatsapp',
    mensagem: sinalPct === 0
      ? `Olá, ${nome}! Seu agendamento para ${servico.nome} em ${data} às ${horario} está confirmado. Em novembro não há cobrança de sinal.`
      : `Olá, ${nome}! Seu agendamento para ${servico.nome} foi pré-reservado para ${data} às ${horario}. Para garantir o horário, o pagamento antecipado é de ${sinalPct}%: R$ ${valorSinal.toFixed(2)} — Enviar o pix para a chave: ${chavePix}`,
    status: 'simulado',
    enviado_em: now,
    criado_em: now,
  };
  memoryDb.notificacoes.set(confirmationNotification.id, confirmationNotification);
  void persistNotificacao(confirmationNotification);

  const dayBeforeNotification: Notificacao = {
    id: crypto.randomUUID(),
    agendamento_id: agendamentoId,
    tipo: 'lembrete_24h',
    canal: 'whatsapp',
    mensagem: `Lembrete (24h antes): Olá ${nome}, seu horário de manicure é amanhã às ${horario}.`,
    status: 'simulado',
    enviado_em: null,
    criado_em: now,
  };
  memoryDb.notificacoes.set(dayBeforeNotification.id, dayBeforeNotification);
  void persistNotificacao(dayBeforeNotification);

  const twoHoursNotification: Notificacao = {
    id: crypto.randomUUID(),
    agendamento_id: agendamentoId,
    tipo: 'lembrete_2h',
    canal: 'whatsapp',
    mensagem: `Lembrete (2h antes): Olá ${nome}, seu horário com Natália Marcela é hoje às ${horario}. Tolerância máxima de 10 minutos.`,
    status: 'simulado',
    enviado_em: null,
    criado_em: now,
  };
  memoryDb.notificacoes.set(twoHoursNotification.id, twoHoursNotification);
  void persistNotificacao(twoHoursNotification);

  res.status(201).json({
    success: true,
    codigo,
    valorSinal,
    sinalPct,
    chavePix,
    createdAt: novoAgendamento.criado_em,
    expiresAt: novoAgendamento.expires_at,
    agendamento: novoAgendamento,
  });
});

app.post('/api/agendamentos/:id/estado-pagamento', async (req, res) => {
  const { nome, whatsapp } = req.body;
  const phoneVal = validateWhatsApp(whatsapp || '');
  if (!phoneVal.valid || !(nome || '').trim()) {
    return res.status(400).json({ error: 'Informe o nome e o WhatsApp usados na reserva.' });
  }

  try {
    await expirePixBookings();
    const booking = await getAgendamentoById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Reserva não encontrada.' });

    const client = await getClienteByWhatsApp(phoneVal.clean);
    if (
      !client ||
      client.id !== booking.cliente_id ||
      client.nome.toLowerCase() !== nome.trim().toLowerCase()
    ) {
      return res.status(403).json({ error: 'Dados não correspondem à reserva.' });
    }

    res.set('Cache-Control', 'no-store');
    res.json({
      status: booking.status,
      pagamento_status: booking.pagamento_status,
      expires_at: booking.expires_at,
    });
  } catch (error) {
    console.error('Falha ao consultar estado do pagamento:', error);
    res.status(502).json({ error: 'Não foi possível consultar o estado atualizado do pagamento.' });
  }
});

// "Meus Horários" - Consulta de agendamentos por Nome + WhatsApp
app.post('/api/meus-horarios', async (req, res) => {
  const { nome, whatsapp } = req.body;
  const phoneVal = validateWhatsApp(whatsapp || '');

  if (!phoneVal.valid) {
    return res.status(400).json({ error: phoneVal.error });
  }

  const cleanName = (nome || '').trim().toLowerCase();
  let cliente: Cliente | null;
  let currentBookings: Agendamento[] | null;
  try {
    await expirePixBookings();
    cliente = await getClienteByWhatsApp(phoneVal.clean);
    currentBookings = cliente ? await listAgendamentosByCliente(cliente.id) : [];
  } catch (error) {
    console.error('Falha ao carregar agendamentos da cliente:', error);
    return res.status(502).json({ error: 'Não foi possível carregar seus agendamentos atualizados.' });
  }

  if (!cliente || cliente.nome.toLowerCase() !== cleanName) {
    return res.status(404).json({ error: 'Nenhum agendamento encontrado para este nome e WhatsApp.' });
  }

  const bookings = currentBookings || Array.from(memoryDb.agendamentos.values())
    .filter((a) => a.cliente_id === cliente.id)
    .sort((a, b) => new Date(b.data_hora_inicio).getTime() - new Date(a.data_hora_inicio).getTime());
  const items = bookings
    .map((a) => ({
      ...a,
      servico_nome: memoryDb.servicos.get(a.servico_id)?.nome || 'Serviço',
      manicure_nome: memoryDb.manicures.get(a.manicure_id || '')?.name || 'Manicure',
      cliente_nome: cliente.nome,
    }))
    .sort((a, b) => new Date(b.data_hora_inicio).getTime() - new Date(a.data_hora_inicio).getTime());

  res.json({ items });
});

// Cancelamento pelo Cliente com Regra de 24h
app.post('/api/agendamentos/:id/cancelar-cliente', async (req, res) => {
  const { id } = req.params;
  const { nome, whatsapp } = req.body;

  const phoneVal = validateWhatsApp(whatsapp || '');
  if (!phoneVal.valid) {
    return res.status(400).json({ error: 'WhatsApp inválido.' });
  }

  let ag: Agendamento | null;
  try {
    ag = await getAgendamentoById(id);
  } catch (error) {
    console.error('Falha ao carregar agendamento para cancelamento:', error);
    return res.status(502).json({ error: 'Não foi possível carregar o agendamento.' });
  }
  if (!ag) {
    return res.status(404).json({ error: 'Agendamento não encontrado.' });
  }

  let cliente: Cliente | null;
  try {
    cliente = await getClienteByWhatsApp(phoneVal.clean);
  } catch (error) {
    console.error('Falha ao validar cliente para cancelamento:', error);
    return res.status(502).json({ error: 'Não foi possível validar seus dados.' });
  }
  if (!cliente || cliente.whatsapp !== phoneVal.clean || cliente.nome.toLowerCase() !== (nome || '').trim().toLowerCase()) {
    return res.status(403).json({ error: 'Não autorizado. Nome e WhatsApp não coincidem com o agendamento.' });
  }
  if (cliente.id !== ag.cliente_id) {
    return res.status(403).json({ error: 'Não autorizado. Nome e WhatsApp não coincidem com o agendamento.' });
  }

  if (ag.status === 'cancelado') {
    return res.status(400).json({ error: 'Este agendamento já está cancelado.' });
  }

  const refundCheck = checkRefundEligibility(ag.data_hora_inicio, getNowInSaoPaulo(), 24);
  const now = new Date().toISOString();

  const cancelledBooking: Agendamento = {
    ...ag,
    status: 'cancelado',
    pagamento_status: ag.pagamento_status === 'aguardando' ? 'expirado' : ag.pagamento_status,
    estorno_elegivel: Number(ag.valor_sinal) > 0 && refundCheck.eligible,
    atualizado_em: now,
  };
  try {
    await persistAgendamentoOrThrow(cancelledBooking);
    memoryDb.agendamentos.set(id, cancelledBooking);
  } catch (error) {
    console.error('Falha ao salvar cancelamento do agendamento:', error);
    return res.status(502).json({ error: 'Não foi possível cancelar o agendamento.' });
  }

  // Notificação simulada de cancelamento
  memoryDb.notificacoes.set(`notif-${Date.now()}-canc`, {
    id: `notif-${Date.now()}-canc`,
    agendamento_id: ag.id,
    tipo: 'cancelamento_cliente',
    canal: 'whatsapp',
    mensagem: `Agendamento ${ag.codigo} cancelado. Estorno do sinal: ${
      refundCheck.eligible ? 'Elegível (>= 24h de antecedência)' : 'Sem estorno (< 24h de antecedência)'
    }. Vaga liberada na hora.`,
    status: 'simulado',
    enviado_em: now,
    criado_em: now,
  });

  // Notificar lista de espera se houver
  const agDateStr = ag.data_hora_inicio.split('T')[0];
  const waitlistEntries = Array.from(memoryDb.listaEspera.values()).filter(
    (l) => l.data === agDateStr && !l.notificado
  );

  for (const entry of waitlistEntries) {
    entry.notificado = true;
    void persistListaEspera(entry);
    memoryDb.notificacoes.set(`notif-${Date.now()}-fila-${entry.id}`, {
      id: `notif-${Date.now()}-fila-${entry.id}`,
      agendamento_id: ag.id,
      tipo: 'vaga_liberada_fila',
      canal: 'whatsapp',
      mensagem: `Vaga liberada! Olá ${entry.nome}, um horário vagou no dia ${agDateStr}. Acesse o aplicativo para agendar.`,
      status: 'simulado',
      enviado_em: now,
      criado_em: now,
    });
    void persistNotificacao(Array.from(memoryDb.notificacoes.values()).at(-1)!);
  }

  res.json({
    success: true,
    estornoElegivel: refundCheck.eligible,
    mensagem: Number(ag.valor_sinal) === 0
      ? 'Agendamento cancelado com sucesso. Este agendamento não teve cobrança de sinal.'
      : refundCheck.eligible
      ? 'Agendamento cancelado com sucesso. Como cancelou com mais de 24h de antecedência, seu sinal é elegível para estorno.'
      : 'Agendamento cancelado. Atenção: cancelamentos com menos de 24h não possuem estorno do sinal.',
  });
});

// Lista de Espera
app.post('/api/lista-espera', (req, res) => {
  const { nome, whatsapp, data, periodo } = req.body;
  const phoneVal = validateWhatsApp(whatsapp || '');
  if (!phoneVal.valid) {
    return res.status(400).json({ error: phoneVal.error });
  }

  const id = `fila-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  memoryDb.listaEspera.set(id, {
    id,
    nome: (nome || '').trim(),
    whatsapp: phoneVal.clean,
    data,
    periodo: periodo || 'qualquer',
    notificado: false,
    criado_em: new Date().toISOString(),
  });
  void persistListaEspera(memoryDb.listaEspera.get(id)!);

  res.status(201).json({ success: true, id });
});

// -------------------------------------------------------------
// 2. ROTAS DA MANICURE (AUTENTICAÇÃO E ADMIN)
// -------------------------------------------------------------

// Verificar se já existe PIN configurado
app.get('/api/admin/check-setup', (req, res) => {
  const hasPin = memoryDb.adminAuth !== null && !!memoryDb.adminAuth.pin_hash;
  res.json({ hasPin });
});

// Primeiro acesso: Definir PIN
app.post('/api/admin/setup-pin', async (req, res) => {
  const { pin } = req.body;
  if (!/^\d{4}$/.test(pin || '')) {
    return res.status(400).json({ error: 'O PIN deve ter exatamente 4 números.' });
  }

  const existingAuth = memoryDb.adminAuth || await getSupabaseAdminAuth();
  if (existingAuth?.pin_hash) {
    return res.status(400).json({ error: 'O PIN já foi configurado anteriormente.' });
  }

  const pinHash = hashPin(pin);
  const now = new Date().toISOString();
  memoryDb.adminAuth = {
    id: crypto.randomUUID(),
    pin_hash: pinHash,
    tentativas_falhas: 0,
    bloqueado_ate: null,
    atualizado_em: now,
  };
  await persistAdminAuth(memoryDb.adminAuth);
  memoryDb.adminAuths.set(memoryDb.adminAuth.id, memoryDb.adminAuth);

  // Cria sessão e cookie
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiraEm = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const session: any = {
    id: crypto.randomUUID(),
    token_hash: tokenHash,
    expira_em: expiraEm,
    criado_em: now,
  };
  memoryDb.sessoes.set(tokenHash, session);
  await persistSessao(session);

  res.cookie('nm_session', rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, token: rawToken });
});

// Login por PIN com bloqueio por 5 minutos após 5 erros
app.post('/api/admin/login', async (req, res) => {
  const { pin } = req.body;
  if (!/^\d{4}$/.test(pin || '')) {
    return res.status(400).json({ error: 'PIN inválido. Digite 4 números.' });
  }

  const persistedAuths = await getSupabaseAdminAuths();
  const authCandidates = persistedAuths.length > 0
    ? persistedAuths
    : Array.from(memoryDb.adminAuths.values()).concat(memoryDb.adminAuth ? [memoryDb.adminAuth] : []);
  const inputHash = hashPin(pin);
  const authenticatedAdmin = authCandidates.find((auth) => auth.pin_hash === inputHash);
  if (!authenticatedAdmin) {
    if (authCandidates.length === 0) {
      return res.status(400).json({ error: 'PIN ainda não configurado. Defina no primeiro acesso.' });
    }
    return res.status(401).json({ error: 'PIN incorreto.' });
  }
  memoryDb.adminAuth = authenticatedAdmin;
  if (!memoryDb.adminAuth) {
    return res.status(400).json({ error: 'PIN ainda não configurado. Defina no primeiro acesso.' });
  }

  const now = new Date();
  if (memoryDb.adminAuth.bloqueado_ate && new Date(memoryDb.adminAuth.bloqueado_ate) > now) {
    const restanteMin = Math.ceil(
      (new Date(memoryDb.adminAuth.bloqueado_ate).getTime() - now.getTime()) / 60000
    );
    return res.status(429).json({
      error: `Muitas tentativas incorretas. Tente novamente em ${restanteMin} minuto(s).`,
    });
  }

  if (inputHash !== memoryDb.adminAuth.pin_hash) {
    const falhas = (memoryDb.adminAuth.tentativas_falhas || 0) + 1;
    let bloqueadoAte: string | null = null;

    if (falhas >= 5) {
      bloqueadoAte = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      memoryDb.adminAuth.tentativas_falhas = 0;
      memoryDb.adminAuth.bloqueado_ate = bloqueadoAte;
      void persistAdminAuth(memoryDb.adminAuth);
      return res.status(429).json({
        error: '5 tentativas erradas. Acesso bloqueado por 5 minutos.',
      });
    }

    memoryDb.adminAuth.tentativas_falhas = falhas;
    void persistAdminAuth(memoryDb.adminAuth);
    return res.status(401).json({
      error: `PIN incorreto. Restam ${5 - falhas} tentativa(s).`,
    });
  }

  // Sucesso
  memoryDb.adminAuth.tentativas_falhas = 0;
  memoryDb.adminAuth.bloqueado_ate = null;
  void persistAdminAuth(memoryDb.adminAuth);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiraEm = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const session: any = {
    id: crypto.randomUUID(),
    token_hash: tokenHash,
    expira_em: expiraEm,
    criado_em: new Date().toISOString(),
    manicure_id: memoryDb.adminAuth.manicure_id || null,
  };
  memoryDb.sessoes.set(tokenHash, session);
  await persistSessao(session);

  res.cookie('nm_session', rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, token: rawToken });
});

// Logout
app.post('/api/admin/logout', async (req, res) => {
  const token = req.cookies?.nm_session;
  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    memoryDb.sessoes.delete(tokenHash);
    void deleteSessionByToken(tokenHash);
  }
  res.clearCookie('nm_session');
  res.json({ success: true });
});

// Trocar PIN
app.post('/api/admin/trocar-pin', requireAdmin, (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!/^\d{4}$/.test(newPin || '')) {
    return res.status(400).json({ error: 'O novo PIN deve conter exatamente 4 números.' });
  }

  if (!memoryDb.adminAuth || hashPin(currentPin) !== memoryDb.adminAuth.pin_hash) {
    return res.status(400).json({ error: 'PIN atual incorreto.' });
  }

  memoryDb.adminAuth.pin_hash = hashPin(newPin);
  memoryDb.adminAuth.atualizado_em = new Date().toISOString();
  void persistAdminAuth(memoryDb.adminAuth);

  // Revoga todas as sessões anteriores
  memoryDb.sessoes.clear();
  void deleteAllSessoes();
  res.clearCookie('nm_session');

  res.json({ success: true, message: 'PIN alterado com sucesso! Faça login novamente.' });
});

// Status Mensal do Calendário (Regra de Cores Estrita: Verde vs Laranja vs Sem Cor)
app.get('/api/admin/mes-status', requireAdmin, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { ano, mes } = req.query as { ano?: string; mes?: string };
  const year = Number(ano) || new Date().getFullYear();
  const month = Number(mes) || new Date().getMonth() + 1;

  const monthStartDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonthStartDate = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const monthStartISO = toSaoPauloISO(monthStartDate, '00:00');
  const nextMonthStartISO = toSaoPauloISO(nextMonthStartDate, '00:00');

  try {
    const bookings = await getAdminAgendamentosInRange(req, monthStartISO, nextMonthStartISO);
    const dayBookingsMap: Record<number, { status: string; sinal_confirmado?: boolean }[]> = {};

    bookings.forEach((booking) => {
      const day = Number(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
      }).format(new Date(booking.data_hora_inicio)));
      if (!dayBookingsMap[day]) dayBookingsMap[day] = [];
      dayBookingsMap[day].push({ status: booking.status, sinal_confirmado: booking.sinal_confirmado });
    });

    const dayStatus: Record<number, { color: 'green' | 'orange' | null; total: number; pendentes: number }> = {};
    for (const [dayStr, dayBookings] of Object.entries(dayBookingsMap)) {
      const day = Number(dayStr);
      const colorResult = computeDayCalendarColor(dayBookings);
      dayStatus[day] = {
        color: colorResult.color,
        total: colorResult.totalActive,
        pendentes: colorResult.totalPending,
      };
    }

    res.json({ dayStatus });
  } catch (error) {
    console.error('Falha ao carregar status mensal dos agendamentos:', error);
    res.status(502).json({ error: 'Não foi possível carregar o status atualizado dos agendamentos.' });
  }
});

// Lista de Agendamentos do Dia
app.get('/api/admin/dia-agendamentos', requireAdmin, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { data } = req.query as { data?: string };
  if (!data) return res.status(400).json({ error: 'Data é obrigatória.' });

  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!dateParts) return res.status(400).json({ error: 'Data inválida.' });
  const [year, month, day] = dateParts.slice(1).map(Number);
  const requestedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    requestedDate.getUTCFullYear() !== year ||
    requestedDate.getUTCMonth() !== month - 1 ||
    requestedDate.getUTCDate() !== day
  ) {
    return res.status(400).json({ error: 'Data inválida.' });
  }

  const nextDate = new Date(requestedDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const startISO = toSaoPauloISO(data, '00:00');
  const endISO = toSaoPauloISO(nextDate, '00:00');

  try {
    const bookings = await getAdminAgendamentosInRange(req, startISO, endISO);
    const agendamentos = bookings
      .sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime())
      .map((booking) => {
        const cliente = memoryDb.clientes.get(booking.cliente_id);
        const servico = memoryDb.servicos.get(booking.servico_id);
        return {
          ...booking,
          cliente_nome: cliente?.nome || 'Cliente',
          cliente_whatsapp: cliente?.whatsapp || '',
          servico_nome: servico?.nome || 'Serviço',
        };
      });

    res.json({ agendamentos });
  } catch (error) {
    console.error('Falha ao carregar agendamentos do dia:', error);
    res.status(502).json({ error: 'Não foi possível carregar os agendamentos atualizados.' });
  }
});

// Atualizar Status (Confirmar Sinal, Concluir, Marcar Falta, Cancelar)
app.patch('/api/admin/agendamentos/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, sinal_confirmado } = req.body;

  const allowedStatuses: Agendamento['status'][] = ['pendente', 'confirmado', 'concluido', 'cancelado', 'falta'];
  if (status !== undefined && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  try {
    const ag = await getAgendamentoById(id);
    if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado.' });
    if (!isInAdminScope(req, ag.manicure_id)) return res.status(403).json({ error: 'Agendamento fora do seu perfil.' });

    if (status === 'confirmado' && ag.pagamento_status === 'aguardando') {
      const confirmed = await confirmPixBooking(id);
      if (!confirmed) {
        await expirePixBookings();
        return res.status(410).json({ error: 'A reserva não pode mais ser confirmada; o prazo do Pix expirou ou ela já foi encerrada.' });
      }
      return res.json({ success: true, agendamento: confirmed });
    }

    const now = new Date();
    if (
      ag.pagamento_status === 'aguardando' &&
      ag.expires_at &&
      new Date(ag.expires_at).getTime() <= now.getTime()
    ) {
      await expirePixBookings();
      return res.status(410).json({ error: 'O prazo do Pix expirou; a reserva foi liberada.' });
    }

    const updatedAgendamento: Agendamento = {
      ...ag,
      status: status ?? ag.status,
      pagamento_status: status === 'confirmado' && ag.pagamento_status === 'aguardando'
        ? 'confirmado'
        : status === 'cancelado' && ag.pagamento_status === 'aguardando'
          ? 'expirado'
          : ag.pagamento_status,
      pagamento_confirmado_em: status === 'confirmado' && ag.pagamento_status === 'aguardando'
        ? now.toISOString()
        : ag.pagamento_confirmado_em,
      sinal_confirmado: status === 'confirmado'
        ? true
        : typeof sinal_confirmado === 'boolean'
          ? sinal_confirmado
          : ag.sinal_confirmado,
      atualizado_em: now.toISOString(),
    };

    await persistAgendamentoOrThrow(updatedAgendamento);
    memoryDb.agendamentos.set(id, updatedAgendamento);
    res.json({ success: true, agendamento: updatedAgendamento });
  } catch (error) {
    console.error('Falha ao atualizar status do agendamento:', error);
    res.status(502).json({ error: 'Não foi possível salvar o status do agendamento.' });
  }
});

// Remarcação pela Manicure (Exceção à regra de 24h)
app.post('/api/admin/agendamentos/:id/remarcar', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { novaData, novoHorario } = req.body;

  const ag = memoryDb.agendamentos.get(id);
  if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado.' });
  if (!isInAdminScope(req, ag.manicure_id)) return res.status(403).json({ error: 'Agendamento fora do seu perfil.' });

  const startISO = toSaoPauloISO(novaData, novoHorario);
  const [h, m] = novoHorario.split(':').map(Number);
  const fimMinTotal = h * 60 + m + ag.duracao_snapshot;
  const endH = Math.floor(fimMinTotal / 60);
  const endM = fimMinTotal % 60;
  const endISO = toSaoPauloISO(novaData, `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);

  ag.data_hora_inicio = startISO;
  ag.data_hora_fim = endISO;
  ag.atualizado_em = new Date().toISOString();
  void persistAgendamento(ag);

  // Notificação simulada
  memoryDb.notificacoes.set(`notif-${Date.now()}-remarc`, {
    id: `notif-${Date.now()}-remarc`,
    agendamento_id: ag.id,
    tipo: 'remarcacao_manicure',
    canal: 'whatsapp',
    mensagem: `Agendamento ${ag.codigo} remarcado pela manicure para ${novaData} às ${novoHorario}.`,
    status: 'simulado',
    enviado_em: new Date().toISOString(),
    criado_em: new Date().toISOString(),
  });
  void persistNotificacao(Array.from(memoryDb.notificacoes.values()).at(-1)!);

  res.json({ success: true, agendamento: ag });
});

// Excluir Agendamento
app.delete('/api/admin/agendamentos/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const ag = memoryDb.agendamentos.get(id);
  if (ag && !isInAdminScope(req, ag.manicure_id)) return res.status(403).json({ error: 'Agendamento fora do seu perfil.' });
  const deleted = memoryDb.agendamentos.delete(id);
  if (!deleted) return res.status(404).json({ error: 'Agendamento não encontrado.' });
  void deleteAgendamento(id);
  res.json({ success: true });
});

// Agendamento Manual pela Manicure
app.post('/api/admin/agendamentos/manual', requireAdmin, async (req, res) => {
  const { servicoId, data, horario, nomeCliente, whatsappCliente, status, observacoes } = req.body;

  const phoneVal = validateWhatsApp(whatsappCliente || '');
  if (!phoneVal.valid) {
    return res.status(400).json({ error: phoneVal.error });
  }

  const servico = memoryDb.servicos.get(servicoId);
  if (!servico) return res.status(404).json({ error: 'Serviço inválido.' });
  if (!isInAdminScope(req, servico.manicure_id)) return res.status(403).json({ error: 'Serviço fora do seu perfil.' });

  let cliente = Array.from(memoryDb.clientes.values()).find((c) => c.whatsapp === phoneVal.clean);
  const now = new Date().toISOString();

  if (!cliente) {
    cliente = {
      id: crypto.randomUUID(),
      nome: (nomeCliente || 'Cliente').trim(),
      whatsapp: phoneVal.clean,
      criado_em: now,
      atualizado_em: now,
    };
    memoryDb.clientes.set(cliente.id, cliente);
  }
  await persistCliente(cliente);

  memoryDb.seqCounter += 1;
  const codigo = `NM-${String(memoryDb.seqCounter).padStart(4, '0')}`;
  const sinalPct = getDepositPercentageForDate(data, Number(configValue(req, 'sinal_percentual', 50)));
  const valorSinal = calculateDeposit(servico.preco, sinalPct);

  const startISO = toSaoPauloISO(data, horario);
  const [h, m] = horario.split(':').map(Number);
  const fimMinTotal = h * 60 + m + servico.duracao_minutos;
  const endISO = toSaoPauloISO(data, `${String(Math.floor(fimMinTotal / 60)).padStart(2, '0')}:${String(fimMinTotal % 60).padStart(2, '0')}`);

  const id = crypto.randomUUID();
  const ag: Agendamento = {
    id,
    codigo,
    cliente_id: cliente.id,
    servico_id: servico.id,
    data_hora_inicio: startISO,
    data_hora_fim: endISO,
    duracao_snapshot: servico.duracao_minutos,
    preco_snapshot: servico.preco,
    valor_sinal: valorSinal,
    status: sinalPct === 0 ? 'confirmado' : status || 'confirmado',
    sinal_confirmado: sinalPct === 0 || status === 'confirmado',
    estorno_elegivel: true,
    observacoes,
    manicure_id: servico.manicure_id || adminManicureId(req),
    criado_em: now,
    atualizado_em: now,
  };
  memoryDb.agendamentos.set(id, ag);
  await persistAgendamento(ag);

  res.status(201).json({ success: true, agendamento: ag });
});

// CRUD Serviços (Admin)
app.post('/api/admin/servicos', requireAdmin, (req, res) => {
  const { nome, preco, duracao_minutos, descricao } = req.body;
  if (!nome || !preco || !duracao_minutos) {
    return res.status(400).json({ error: 'Nome, preço e duração são obrigatórios.' });
  }

  const id = `srv-${Date.now()}`;
  const now = new Date().toISOString();
  const servico: Servico = {
    id,
    nome: nome.trim(),
    preco: Number(preco),
    duracao_minutos: Number(duracao_minutos),
    descricao: (descricao || '').trim(),
    ordem: memoryDb.servicos.size + 1,
    ativo: true,
    criado_em: now,
    atualizado_em: now,
    manicure_id: adminManicureId(req),
  };
  memoryDb.servicos.set(id, servico);
  void persistServico(servico);
  res.status(201).json({ success: true, servico });
});

app.put('/api/admin/servicos/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { nome, preco, duracao_minutos, descricao } = req.body;
  const servico = memoryDb.servicos.get(id);

  if (!servico) return res.status(404).json({ error: 'Serviço não encontrado.' });
  if (!isInAdminScope(req, servico.manicure_id)) return res.status(403).json({ error: 'Serviço fora do seu perfil.' });

  if (nome) servico.nome = nome.trim();
  if (preco !== undefined) servico.preco = Number(preco);
  if (duracao_minutos !== undefined) servico.duracao_minutos = Number(duracao_minutos);
  if (descricao !== undefined) servico.descricao = descricao.trim();
  servico.atualizado_em = new Date().toISOString();
  void persistServico(servico);

  res.json({ success: true, servico });
});

app.delete('/api/admin/servicos/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const servico = memoryDb.servicos.get(id);
  if (!servico) return res.status(404).json({ error: 'Serviço não encontrado.' });
  if (!isInAdminScope(req, servico.manicure_id)) return res.status(403).json({ error: 'Serviço fora do seu perfil.' });

  // Inativa o serviço
  servico.ativo = false;
  servico.atualizado_em = new Date().toISOString();
  void persistServico(servico);
  res.json({ success: true });
});

// CRUD Bloqueios
app.get('/api/admin/bloqueios', requireAdmin, (req, res) => {
  const bloqueios = Array.from(memoryDb.bloqueios.values()).filter((item) => isInAdminScope(req, item.manicure_id));
  res.json({ bloqueios });
});

app.post('/api/admin/bloqueios', requireAdmin, (req, res) => {
  const { dataInicio, dataFim, motivo, diaInteiro } = req.body;
  if (!dataInicio) return res.status(400).json({ error: 'Data de início é obrigatória.' });

  const id = `blk-${Date.now()}`;
  const now = new Date().toISOString();
  const bloqueio: Bloqueio = {
    id,
    data_inicio: dataInicio,
    data_fim: dataFim || dataInicio,
    motivo: (motivo || 'Compromisso pessoal').trim(),
    dia_inteiro: !!diaInteiro,
    criado_em: now,
    manicure_id: adminManicureId(req),
  };
  memoryDb.bloqueios.set(id, bloqueio);
  void persistBloqueio(bloqueio);
  res.status(201).json({ success: true, bloqueio });
});

app.delete('/api/admin/bloqueios/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const bloqueio = memoryDb.bloqueios.get(id);
  if (bloqueio && !isInAdminScope(req, bloqueio.manicure_id)) return res.status(403).json({ error: 'Bloqueio fora do seu perfil.' });
  memoryDb.bloqueios.delete(id);
  void deleteBloqueio(id);
  res.json({ success: true });
});

// Configurações e Horários
app.get('/api/admin/configuracoes', requireAdmin, (req, res) => {
  const configs: Record<string, any> = {};
  memoryDb.configuracoes.forEach((c) => {
    if (isInAdminScope(req, c.manicure_id)) configs[c.chave] = c.valor;
  });
  res.json({ configs });
});

app.post('/api/admin/configuracoes', requireAdmin, async (req, res) => {
  const { configs } = req.body;
  if (!configs || typeof configs !== 'object') {
    return res.status(400).json({ error: 'Configurações inválidas.' });
  }

  const now = new Date().toISOString();
  for (const [chave, valor] of Object.entries(configs)) {
    const mapKey = adminManicureId(req) ? `${adminManicureId(req)}:${chave}` : chave;
    memoryDb.configuracoes.set(mapKey, {
      id: `cfg-${mapKey}`,
      chave,
      valor,
      atualizado_em: now,
      manicure_id: adminManicureId(req),
    });
  }

  try {
    await saveSupabaseConfig(configs, adminManicureId(req));
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: 'Não foi possível salvar as configurações no Supabase.' });
  }
});

// Exportação CSV de agendamentos
app.get('/api/admin/export-csv', requireAdmin, (req, res) => {
  const headers = [
    'Codigo',
    'Cliente',
    'WhatsApp',
    'Servico',
    'Data',
    'Inicio',
    'Fim',
    'Preco',
    'Sinal',
    'Status',
    'SinalConfirmado',
  ];

  const rows = Array.from(memoryDb.agendamentos.values()).filter((a) => isInAdminScope(req, a.manicure_id)).map((a) => {
    const cliente = memoryDb.clientes.get(a.cliente_id);
    const servico = memoryDb.servicos.get(a.servico_id);

    return [
      a.codigo,
      `"${(cliente?.nome || '').replace(/"/g, '""')}"`,
      cliente?.whatsapp || '',
      `"${(servico?.nome || '').replace(/"/g, '""')}"`,
      formatInSaoPaulo(a.data_hora_inicio, { day: '2-digit', month: '2-digit', year: 'numeric' }),
      formatInSaoPaulo(a.data_hora_inicio, { hour: '2-digit', minute: '2-digit' }),
      formatInSaoPaulo(a.data_hora_fim, { hour: '2-digit', minute: '2-digit' }),
      Number(a.preco_snapshot).toFixed(2),
      Number(a.valor_sinal).toFixed(2),
      a.status,
      a.sinal_confirmado ? 'SIM' : 'NAO',
    ].join(';');
  });

  const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="agendamentos_natalia_marcela.csv"');
  res.send(csv);
});

// Sincronização Simulada Idempotente com Google Agenda / CRM
app.post('/api/admin/sync-simulado', requireAdmin, (req, res) => {
  const activeCount = Array.from(memoryDb.agendamentos.values())
    .filter((a) => isInAdminScope(req, a.manicure_id) && a.status !== 'cancelado').length;
  res.json({
    success: true,
    message: `[SIMULAÇÃO] ${activeCount} agendamento(s) sincronizado(s) de forma idempotente com Google Agenda / CRM externo via NM-Code. Nenhuma chamada externa real foi realizada.`,
  });
});

// -------------------------------------------------------------
// VITE MIDDLEWARES EM DEV / SERVIR DIST EM PROD
// -------------------------------------------------------------
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

export default app;

if (!process.env.VERCEL) {
  ensureConfigLoaded()
    .then(() => setupVite())
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
