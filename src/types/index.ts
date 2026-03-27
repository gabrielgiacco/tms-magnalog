export type StatusEntrega =
  | "PROGRAMADO"
  | "EM_SEPARACAO"
  | "CARREGADO"
  | "EM_ROTA"
  | "ENTREGUE"
  | "FINALIZADO"
  | "OCORRENCIA";

export type StatusRota =
  | "PLANEJADA"
  | "EM_ANDAMENTO"
  | "CONCLUIDA"
  | "CANCELADA";

export type TipoVeiculo =
  | "VUC"
  | "TRES_QUARTOS"
  | "TOCO"
  | "TRUCK"
  | "CARRETA"
  | "BITRUCK";

export type UserRole = "ADMIN" | "FINANCEIRO" | "OPERACIONAL" | "CLIENTE";

export interface Motorista {
  id: string;
  nome: string;
  cpf?: string | null;
  cnh?: string | null;
  categoriaCnh?: string | null;
  telefone?: string | null;
  ativo: boolean;
  createdAt: string;
  _count?: { entregas: number; rotas: number };
}

export interface Veiculo {
  id: string;
  placa: string;
  tipo: TipoVeiculo;
  modelo?: string | null;
  ano?: number | null;
  capacidadeKg?: number | null;
  ativo: boolean;
  createdAt: string;
  _count?: { entregas: number };
}

export interface NotaFiscal {
  id: string;
  chaveAcesso: string;
  numero: string;
  serie?: string | null;
  emitenteCnpj: string;
  emitenteRazao: string;
  destinatarioCnpj: string;
  destinatarioRazao: string;
  cidade?: string | null;
  uf?: string | null;
  volumes: number;
  pesoBruto: number;
  valorNota: number;
  dataEmissao?: string | null;
  entregaId?: string | null;
  createdAt: string;
  entrega?: Partial<Entrega> | null;
}

export interface Ocorrencia {
  id: string;
  entregaId: string;
  tipo: string;
  descricao: string;
  resolucao?: string | null;
  resolvida: boolean;
  createdAt: string;
}

export interface Entrega {
  id: string;
  codigo: string;
  clienteId?: string | null;
  cnpj: string;
  razaoSocial: string;
  cidade: string;
  uf?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cep?: string | null;
  dataChegada?: string | null;
  dataAgendada?: string | null;
  dataEntrega?: string | null;
  motoristaId?: string | null;
  veiculoId?: string | null;
  rotaId?: string | null;
  pesoTotal: number;
  volumeTotal: number;
  status: StatusEntrega;
  observacoes?: string | null;
  valorFrete: number;
  valorDescarga: number;
  valorArmazenagem: number;
  diasArmazenagem: number;
  adiantamento: number;
  dataPagamento?: string | null;
  saldoPendente: number;
  createdAt: string;
  updatedAt: string;
  motorista?: Pick<Motorista, "id" | "nome"> | null;
  veiculo?: Pick<Veiculo, "id" | "placa" | "tipo"> | null;
  rota?: Pick<Rota, "id" | "codigo"> | null;
  notas?: NotaFiscal[];
  ocorrencias?: Ocorrencia[];
  _count?: { notas: number; ocorrencias: number };
}

export interface Rota {
  id: string;
  codigo: string;
  data: string;
  motoristaId?: string | null;
  veiculoId?: string | null;
  pesoTotal: number;
  volumeTotal: number;
  status: StatusRota;
  observacoes?: string | null;
  createdAt: string;
  motorista?: Pick<Motorista, "id" | "nome"> | null;
  veiculo?: Pick<Veiculo, "id" | "placa" | "tipo"> | null;
  entregas?: Partial<Entrega>[];
  _count?: { entregas: number };
}

export interface DashboardData {
  kpis: {
    emAndamento: number;
    atrasadas: number;
    entreguesHoje: number;
    pesoMes: number;
    freteMes: number;
    saldoPendente: number;
    ocorrenciasAbertas: number;
  };
  porStatus: { status: StatusEntrega; _count: number }[];
  ultimasEntregas: Partial<Entrega>[];
  graficoSemana: { data: string; count: number }[];
}

export interface ImportResult {
  importadas: number;
  duplicadas: number;
  agrupadas: number;
  erros: { arquivo: string; erro: string }[];
  notas: {
    numero: string;
    destinatario: string;
    cidade: string;
    peso: number;
    volumes: number;
    entrega: string;
    agrupada: boolean;
  }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}
