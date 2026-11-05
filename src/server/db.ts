import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { DEFAULT_BUSINESS_HOURS } from '../utils/slots.js';

export interface Manicure {
  id: string;
  slug: string;
  name: string;
  instagram: string | null;
  photo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  whatsapp: string;
  criado_em: string;
  atualizado_em: string;
}

export interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  descricao: string;
  ordem: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  manicure_id?: string | null;
}

export interface Configuracao {
  id: string;
  chave: string;
  valor: any;
  descricao?: string;
  atualizado_em: string;
  manicure_id?: string | null;
}

export interface Agendamento {
  id: string;
  codigo: string;
  cliente_id: string;
  servico_id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  duracao_snapshot: number;
  preco_snapshot: number;
  valor_sinal: number;
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado' | 'falta';
  sinal_confirmado: boolean;
  estorno_elegivel: boolean;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
  // Joins
  cliente?: Cliente;
  servico?: Servico;
  manicure_id?: string | null;
}

export interface Bloqueio {
  id: string;
  data_inicio: string;
  data_fim: string;
  motivo: string;
  dia_inteiro: boolean;
  criado_em: string;
  manicure_id?: string | null;
}

export interface AdminAuth {
  id: string;
  pin_hash: string;
  tentativas_falhas: number;
  bloqueado_ate: string | null;
  atualizado_em: string;
  manicure_id?: string | null;
}

export interface Sessao {
  id: string;
  token_hash: string;
  expira_em: string;
  criado_em: string;
  manicure_id?: string | null;
}

export interface ListaEspera {
  id: string;
  nome: string;
  whatsapp: string;
  data: string;
  periodo: 'manha' | 'tarde' | 'qualquer';
  notificado: boolean;
  criado_em: string;
  manicure_id?: string | null;
}

export interface Notificacao {
  id: string;
  agendamento_id: string;
  tipo: string;
  canal: 'whatsapp' | 'sms' | 'email';
  mensagem: string;
  status: 'simulado';
  enviado_em: string | null;
  criado_em: string;
  manicure_id?: string | null;
}

// In-Memory Database store with exact initial seed
class MemoryDatabase {
  clientes: Map<string, Cliente> = new Map();
  servicos: Map<string, Servico> = new Map();
  configuracoes: Map<string, Configuracao> = new Map();
  agendamentos: Map<string, Agendamento> = new Map();
  bloqueios: Map<string, Bloqueio> = new Map();
  adminAuth: AdminAuth | null = null;
  sessoes: Map<string, Sessao> = new Map();
  listaEspera: Map<string, ListaEspera> = new Map();
  notificacoes: Map<string, Notificacao> = new Map();
  manicures: Map<string, Manicure> = new Map();
  seqCounter: number = 0;

  constructor() {
    this.seed();
  }

  seedDefaultManicure() {
    const now = new Date().toISOString();
    this.manicures.set('default-manicure', {
      id: 'default-manicure',
      slug: 'natalia',
      name: 'Natália Marcela',
      instagram: 'nataliamarcelanail',
      photo_url: null,
      active: true,
      created_at: now,
      updated_at: now,
    });
  }

  seed() {
    const now = new Date().toISOString();
    this.seedDefaultManicure();

    // 1. Serviços Iniciais do Catálogo Oficial
    const catalog = [
      { id: 'srv-1', nome: 'Alongamento Molde F1', preco: 130, duracao_minutos: 120, descricao: 'Alongamento completo com acabamento impecável e alta durabilidade.', ordem: 1 },
      { id: 'srv-2', nome: 'Banho de Gel', preco: 100, duracao_minutos: 90, descricao: 'Camada protetora sobre a unha natural para evitar quebras.', ordem: 2 },
      { id: 'srv-3', nome: 'Manutenção', preco: 95, duracao_minutos: 60, descricao: 'Reposição de gel, alinhamento e acabamento perfeito.', ordem: 3 },
      { id: 'srv-4', nome: 'Gel no Pé', preco: 65, duracao_minutos: 60, descricao: 'Esmaltação e reforço em gel com longa durabilidade.', ordem: 4 },
      { id: 'srv-5', nome: 'Esmaltação em Gel', preco: 60, duracao_minutos: 60, descricao: 'Brilho intenso e secagem instantânea na cabine UV.', ordem: 5 },
    ];

    for (const item of catalog) {
      this.servicos.set(item.id, {
        ...item,
        ativo: true,
        criado_em: now,
        atualizado_em: now,
      });
    }

    // 2. Configurações Operacionais
    const configs: Record<string, any> = {
      chave_pix: 'nataliamarcela49@gmail.com',
      sinal_percentual: 50,
      buffer_minutos: 10,
      tolerancia_atraso_minutos: 10,
      antecedencia_estorno_horas: 24,
      antecedencia_remarcacao_horas: 24,
      horarios_funcionamento: DEFAULT_BUSINESS_HOURS,
    };

    for (const [chave, valor] of Object.entries(configs)) {
      this.configuracoes.set(chave, {
        id: `cfg-${chave}`,
        chave,
        valor,
        atualizado_em: now,
      });
    }

    // 3. Clientes de exemplo para demonstração de Meus Horários e Calendário
    const cli1: Cliente = {
      id: 'cli-1',
      nome: 'Camila Fernandes',
      whatsapp: '11987654321',
      criado_em: now,
      atualizado_em: now,
    };
    const cli2: Cliente = {
      id: 'cli-2',
      nome: 'Juliana Rocha',
      whatsapp: '11999887766',
      criado_em: now,
      atualizado_em: now,
    };
    this.clientes.set(cli1.id, cli1);
    this.clientes.set(cli2.id, cli2);

    // 4. Agendamentos de exemplo:
    // Dia 2026-11-05: um com sinal confirmado (fica VERDE se só tiver ele)
    // Dia 2026-11-06: um com pendente (fica LARANJA)
    this.seqCounter = 2;
    const ag1: Agendamento = {
      id: 'ag-1',
      codigo: 'NM-0001',
      cliente_id: cli1.id,
      servico_id: 'srv-1',
      data_hora_inicio: '2026-11-05T14:00:00.000-03:00',
      data_hora_fim: '2026-11-05T16:00:00.000-03:00',
      duracao_snapshot: 120,
      preco_snapshot: 130,
      valor_sinal: 65,
      status: 'confirmado',
      sinal_confirmado: true,
      estorno_elegivel: true,
      criado_em: now,
      atualizado_em: now,
    };
    const ag2: Agendamento = {
      id: 'ag-2',
      codigo: 'NM-0002',
      cliente_id: cli2.id,
      servico_id: 'srv-2',
      data_hora_inicio: '2026-11-06T10:00:00.000-03:00',
      data_hora_fim: '2026-11-06T11:30:00.000-03:00',
      duracao_snapshot: 90,
      preco_snapshot: 100,
      valor_sinal: 50,
      status: 'pendente',
      sinal_confirmado: false,
      estorno_elegivel: true,
      criado_em: now,
      atualizado_em: now,
    };
    this.agendamentos.set(ag1.id, ag1);
    this.agendamentos.set(ag2.id, ag2);
  }
}

export const memoryDb = new MemoryDatabase();

// Criação do Supabase Server Client caso as variáveis de ambiente existam
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

function createSupabaseServerClient(): SupabaseClient | null {
  const normalizedUrl = supabaseUrl?.trim();
  const normalizedKey = supabaseServiceKey?.trim();
  if (!normalizedUrl || !normalizedKey || normalizedUrl === 'MY_SUPABASE_URL') {
    return null;
  }

  try {
    return createClient(normalizedUrl, normalizedKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (error) {
    console.error('Configuração do Supabase inválida:', error);
    return null;
  }
}

export const supabaseClient = createSupabaseServerClient();

export const isUsingSupabase = !!supabaseClient;

type Persistable = object;

async function supabaseUpsert(table: string, value: Persistable): Promise<void> {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.from(table).upsert(value);
  if (error) console.error(`Supabase ${table} upsert failed:`, error.message);
}

async function supabaseDelete(table: string, id: string): Promise<void> {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.from(table).delete().eq('id', id);
  if (error) console.error(`Supabase ${table} delete failed:`, error.message);
}

async function hydrateTable<T extends Persistable>(
  table: string,
  target: Map<string, T>,
  transform: (row: any) => T = (row) => row as T,
): Promise<void> {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from(table).select('*');
  if (error) {
    console.error(`Não foi possível carregar ${table} do Supabase:`, error.message);
    return;
  }
  target.clear();
  for (const row of data || []) {
    const item = transform(row as any);
    if ((item as any).id) target.set(String((item as any).id), item);
  }
}

export async function hydrateSupabaseData(): Promise<void> {
  if (!supabaseClient) return;
  await Promise.all([
    hydrateTable('manicures', memoryDb.manicures),
    hydrateTable('servicos', memoryDb.servicos),
    hydrateTable('clientes', memoryDb.clientes),
    hydrateTable('agendamentos', memoryDb.agendamentos),
    hydrateTable('bloqueios', memoryDb.bloqueios),
    hydrateTable('lista_espera', memoryDb.listaEspera),
    hydrateTable('notificacoes', memoryDb.notificacoes),
    hydrateTable('sessoes', memoryDb.sessoes, (row) => ({ ...row, id: String(row.id), token_hash: String(row.token_hash) })),
  ]);
  const { data: auth, error: authError } = await supabaseClient.from('admin_auth').select('*').limit(1).maybeSingle();
  if (!authError && auth) memoryDb.adminAuth = auth as AdminAuth;
  if (memoryDb.manicures.size === 0) memoryDb.seedDefaultManicure();
  memoryDb.seqCounter = Array.from(memoryDb.agendamentos.values())
    .map((item) => Number(item.codigo?.replace(/\D/g, '') || 0))
    .reduce((max, value) => Math.max(max, value), 0);
}

export const persistServico = (value: Servico) => supabaseUpsert('servicos', value);
export const persistCliente = (value: Cliente) => supabaseUpsert('clientes', value);
export const persistAgendamento = (value: Agendamento) => supabaseUpsert('agendamentos', value);
export const persistBloqueio = (value: Bloqueio) => supabaseUpsert('bloqueios', value);
export const persistListaEspera = (value: ListaEspera) => supabaseUpsert('lista_espera', value);
export const persistNotificacao = (value: Notificacao) => supabaseUpsert('notificacoes', value);
export const persistManicure = (value: Manicure) => supabaseUpsert('manicures', value);
export const deleteAgendamento = (id: string) => supabaseDelete('agendamentos', id);
export const deleteBloqueio = (id: string) => supabaseDelete('bloqueios', id);
export const persistSessao = (value: Sessao) => supabaseUpsert('sessoes', value);
export const deleteSessao = (id: string) => supabaseDelete('sessoes', id);
export async function deleteSessionByToken(tokenHash: string): Promise<void> {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.from('sessoes').delete().eq('token_hash', tokenHash);
  if (error) console.error('Supabase sessoes delete failed:', error.message);
}
export async function deleteAllSessoes(): Promise<void> {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.from('sessoes').delete().not('id', 'is', null);
  if (error) console.error('Supabase sessoes revoke failed:', error.message);
}

export async function persistAdminAuth(value: AdminAuth | null): Promise<void> {
  if (!supabaseClient || !value) return;
  await supabaseUpsert('admin_auth', value);
}

export async function findSupabaseSession(tokenHash: string): Promise<Sessao | null> {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from('sessoes').select('*').eq('token_hash', tokenHash).maybeSingle();
  if (error || !data) return null;
  return data as Sessao;
}

export async function getSupabaseAdminAuth(): Promise<AdminAuth | null> {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from('admin_auth').select('*').limit(1).maybeSingle();
  return !error && data ? (data as AdminAuth) : null;
}

const supabaseConfigKeyMap: Record<string, string> = {
  chave_pix: 'chave_pix',
  buffer_minutos: 'buffer_min',
  sinal_percentual: 'sinal_percentual',
  tolerancia_atraso_minutos: 'tolerancia_atraso_min',
  antecedencia_estorno_horas: 'horas_estorno',
  antecedencia_remarcacao_horas: 'horas_remarcacao',
  horarios_funcionamento: 'horarios',
};

export async function loadSupabaseConfig(): Promise<void> {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient.from('configuracoes').select('*');
  if (error) {
    throw new Error(`Não foi possível carregar as configurações do Supabase: ${error.message}`);
  }
  if (!data?.length) return;

  const now = new Date().toISOString();
  for (const row of data) {
    const appKey = row.chave as string;
    if (appKey && row.valor !== undefined && row.valor !== null) {
      memoryDb.configuracoes.set(appKey, {
        id: String(row.id),
        chave: appKey,
        valor: row.valor,
        atualizado_em: row.atualizado_em || now,
      });
    }
  }
}

export async function saveSupabaseConfig(configs: Record<string, unknown>): Promise<void> {
  if (!supabaseClient) return;

  const { data, error: readError } = await supabaseClient.from('configuracoes').select('id').limit(1).single();
  if (readError || !data) {
    throw new Error(`Não foi possível localizar as configurações no Supabase: ${readError?.message || 'registro ausente'}`);
  }

  const update = Object.fromEntries(
    Object.entries(configs)
      .filter(([key, value]) => supabaseConfigKeyMap[key] && value !== undefined)
      .map(([key, value]) => [supabaseConfigKeyMap[key], value]),
  );
  if (Object.keys(update).length === 0) return;

  const { error } = await supabaseClient.from('configuracoes').update(update).eq('id', data.id);
  if (error) {
    throw new Error(`Não foi possível salvar as configurações no Supabase: ${error.message}`);
  }
}

// Hash PBKDF2 para PIN
export function hashPin(pin: string): string {
  return crypto.pbkdf2Sync(pin, 'nm_secure_salt_2026', 100000, 32, 'sha256').toString('hex');
}
