export type DataRecord = Record<string, string>;

export type DataSet = {
  format: 'librelayer-dataset';
  version: 1;
  name: string;
  columns: string[];
  records: DataRecord[];
};

const MAX_ROWS = 250;
const MAX_COLUMNS = 50;
const MAX_CELL_LENGTH = 10_000;

const cleanCell = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.slice(0, MAX_CELL_LENGTH);
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  )
    return String(value).slice(0, MAX_CELL_LENGTH);
  throw Error('Dataset cells must contain text, numbers, or booleans.');
};

function csvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index++;
      row.push(cell);
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      cell = '';
    } else cell += character;
  }
  if (quoted) throw Error('The CSV contains an unterminated quoted value.');
  row.push(cell);
  if (row.some((value) => value.length)) rows.push(row);
  return rows;
}

const normalizeRecords = (
  values: unknown[],
  name: string,
  declaredColumns?: unknown,
): DataSet => {
  if (!values.length || values.length > MAX_ROWS)
    throw Error(`Datasets require 1 to ${MAX_ROWS} records.`);
  if (
    values.some(
      (value) => !value || typeof value !== 'object' || Array.isArray(value),
    )
  )
    throw Error('Every dataset record must be an object.');
  const inferred = [
      ...new Set(values.flatMap((value) => Object.keys(value as object))),
    ],
    columns = Array.isArray(declaredColumns)
      ? declaredColumns.map(cleanCell)
      : inferred;
  if (
    !columns.length ||
    columns.length > MAX_COLUMNS ||
    columns.some((column) => !column.trim()) ||
    new Set(columns).size !== columns.length
  )
    throw Error(`Datasets require 1 to ${MAX_COLUMNS} unique named columns.`);
  const records = values.map((value) => {
    const source = value as Record<string, unknown>,
      record: DataRecord = {};
    for (const column of columns) record[column] = cleanCell(source[column]);
    return record;
  });
  return {
    format: 'librelayer-dataset',
    version: 1,
    name: name.trim().slice(0, 120) || 'Untitled dataset',
    columns,
    records,
  };
};

export function parseDataSet(text: string, fallbackName = 'Imported dataset') {
  if (new TextEncoder().encode(text).length > 1_000_000)
    throw Error('Dataset files must be 1 MB or smaller.');
  const trimmed = text.trim();
  if (!trimmed) throw Error('The dataset is empty.');
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    let value: unknown;
    try {
      value = JSON.parse(trimmed);
    } catch {
      throw Error('The dataset is not valid JSON.');
    }
    if (Array.isArray(value)) return normalizeRecords(value, fallbackName);
    if (!value || typeof value !== 'object')
      throw Error('The dataset is invalid.');
    const candidate = value as Partial<DataSet>;
    if (
      candidate.format !== 'librelayer-dataset' ||
      candidate.version !== 1 ||
      typeof candidate.name !== 'string' ||
      !Array.isArray(candidate.records)
    )
      throw Error('This LibreLayer dataset version is unsupported.');
    return normalizeRecords(
      candidate.records,
      candidate.name,
      candidate.columns,
    );
  }
  const rows = csvRows(trimmed),
    columns = rows.shift()?.map((column) => column.trim()) ?? [];
  if (!columns.length) throw Error('The CSV requires a header row.');
  const records = rows.map((values) =>
    Object.fromEntries(
      columns.map((column, index) => [column, values[index] ?? '']),
    ),
  );
  return normalizeRecords(records, fallbackName, columns);
}

export function substituteDataVariables(template: string, record: DataRecord) {
  return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, key: string) =>
    Object.hasOwn(record, key) ? record[key] : match,
  );
}

export function dataRecordName(record: DataRecord, index: number) {
  const value = record.name || record.title || record.id || record.filename;
  return (value || `Row ${index + 1}`)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .slice(0, 80);
}
