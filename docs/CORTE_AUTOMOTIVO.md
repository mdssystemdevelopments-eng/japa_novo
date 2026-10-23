# Módulo Corte Automotivo — status técnico

## Implementado

- **Backend** (`/api/cut-automotive/*`): catálogo de veículos, moldes (import SVG, aprovação), perfis de plotter (exportação de arquivo), trabalhos (itens, nesting, export SVG, simulação).
- **Motor geométrico** (`backend/src/cut-engine`): unidades mm, validação de polígonos, import SVG básico, nesting shelf com detecção de colisão por bbox, export SVG de layout.
- **Banco**: migração `20261023214520_cut_automotive` (Neon aplicada).
- **Permissões**: `cut.read`, `cut.manage`, `cut.validate`.
- **Frontend**: `/corte-automotivo`, catálogo, moldes, menu integrado.
- **Testes**: `cut-engine/polygon.spec.ts`.

## Pendente / limitações (substituição integral Tech-Cut)

- Biblioteca comercial de moldes licenciada ou base própria validada (não incluída).
- Nesting com contorno real (atual: bbox + aviso explícito).
- DXF/HPG-GL/plotter: apenas perfis + export SVG; **sem** comunicação serial/USB documentada.
- Editor vetorial avançado (edição de nós, arcos) — visualização e persistência de geometria JSON.
- Testes físicos em plotter e calibração dimensional.

## Plotter

Modo padrão: **simulação** + **FILE_EXPORT_ONLY**. Não há envio falso à máquina.

## Importação SVG

Moldes importados ficam **PENDING_VALIDATION** até usuário com `cut.validate` aprovar.
