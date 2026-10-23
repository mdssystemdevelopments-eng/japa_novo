# Módulo Corte Automotivo

Substituto operacional ao fluxo Tech-Cut: moldes próprios/licenciados, nesting, exportação e plotter configurável.

## Implementado

- **API** (`/api/cut-automotive/*`): catálogo, moldes (import SVG individual ou lote), aprovação, plotters, trabalhos.
- **Motor** (`backend/src/cut-engine`):
  - Nesting com rotações 0/90/180/270, colisão **SAT** entre contornos.
  - Export **SVG**, **DXF R12** (mm) e **HPGL**.
  - **Plotter**: `FILE_EXPORT_ONLY`, `NETWORK_HPGL` (TCP porta 9100), `LOCAL_SERIAL` (agente na PC do operador).
- **Simulação**: `simulationMode` padrão `true` no trabalho — gera arquivos e registra eventos **sem** abrir socket serial/TCP.
- **Estoque**: após envio HPGL em produção (não simulação), baixa material vinculado ao produto (unidade `M` = comprimento em metros).
- **Frontend**: catálogo, moldes (+ detalhe), trabalhos (+ fluxo nest/export/dispatch), plotters.
- **Testes**: `polygon`, `dxf-export`, `hpgl-export`, `nesting-advanced`.

## Biblioteca de moldes comercial

Não incluímos base proprietária de terceiros. Fluxo recomendado:

1. Importar SVG de fonte **licenciada** ou desenhada internamente (`licenseRef` no import).
2. Validar visualmente e aprovar (`cut.validate`).
3. Vincular ao catálogo de veículos.

Import em lote: `POST /api/cut-automotive/patterns/import/batch`.

## Plotter serial (USB)

O backend em cloud **não** acessa COM/USB. Na máquina local:

```bash
cd backend
npm install serialport   # apenas na estação de corte
node scripts/plotter-serial-agent.mjs --port COM3 --file corte.hpgl
```

Perfil `LOCAL_SERIAL` gera HPGL/DXF para download; o operador envia com o agente.

## Migrações

- `20261023214520_cut_automotive` — tabelas do módulo.
- `20261023230000_cut_plotter_modes` — enum `NETWORK_HPGL`, `LOCAL_SERIAL`.

## Pendências realistas

- Nesting ótimo (não bin packing industrial).
- Editor vetorial completo (nós/arcos) — hoje preview + geometria JSON.
- Calibração física por modelo de plotter (escala HPGL).
