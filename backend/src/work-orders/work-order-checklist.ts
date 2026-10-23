export const DEFAULT_WORK_ORDER_CHECKLIST = [
  { key: 'recebimento', label: 'Recebimento do veículo', done: false },
  { key: 'conferencia', label: 'Conferência inicial', done: false },
  { key: 'protecao', label: 'Proteção das áreas internas', done: false },
  { key: 'preparacao', label: 'Preparação dos vidros', done: false },
  { key: 'aplicacao', label: 'Aplicação da película', done: false },
  { key: 'inspecao', label: 'Inspeção final', done: false },
  { key: 'fotos', label: 'Registro fotográfico', done: false },
  { key: 'entrega', label: 'Entrega do veículo', done: false },
] as const;
