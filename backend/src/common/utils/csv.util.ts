export type ParsedCsvRow = Record<string, string>;

export function parseCsv(text: string): ParsedCsvRow[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const delimiter = normalized.includes(';') ? ';' : ',';
  const lines = normalized.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0], delimiter).map((h) =>
    h.trim().toLowerCase(),
  );

  const rows: ParsedCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delimiter);
    const row: ParsedCsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

export function mapImportRow(row: ParsedCsvRow) {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (row[k]) return row[k];
    }
    return '';
  };
  const qtyRaw = pick('quantidade', 'qtd', 'quantity', 'qtde').replace(',', '.');
  const costRaw = pick('valor_unitario', 'preco', 'unit_cost', 'valor').replace(',', '.');
  return {
    code: pick('codigo', 'código', 'sku', 'internal_code'),
    description: pick('descricao', 'descrição', 'description', 'produto'),
    quantity: parseFloat(qtyRaw) || 0,
    unitCost: parseFloat(costRaw) || 0,
    ncm: pick('ncm'),
    unit: pick('unidade', 'unit', 'un'),
  };
}
