function csvDelimiter(source) {
  let quoted = false;
  let content = false;
  let commas = 0;
  let semicolons = 0;
  for (const character of source) {
    if (character === '"') quoted = !quoted;
    if (quoted) continue;
    if (character === '\n' || character === '\r') {
      if (content) break;
      continue;
    }
    if (character.trim()) content = true;
    if (character === ',') commas += 1;
    if (character === ';') semicolons += 1;
  }
  return semicolons > commas ? ';' : ',';
}

export function readCsv(raw, { maxRows, rowLabel, trimFields = true }) {
  const source = raw.replace(/^\ufeff/u, '');
  if (source.includes('\0')) throw new Error('Save the file as a UTF-8 CSV and try again.');
  const delimiter = csvDelimiter(source);
  const records = [];
  let cells = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  let line = 1;
  let startLine = 1;

  function closeField() {
    cells.push(trimFields ? field.trim() : field);
    field = '';
    afterQuote = false;
  }

  function closeRecord() {
    closeField();
    if (cells.some(value => value.trim())) records.push({ cells, line: startLine });
    cells = [];
    if (records.length > maxRows + 1) throw new Error(`A file can contain up to ${maxRows} ${rowLabel} rows.`);
  }

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '\r' || character === '\n') {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      if (quoted) field += '\n';
      else closeRecord();
      line += 1;
      if (!quoted) startLine = line;
    } else if (quoted) {
      if (character !== '"') {
        field += character;
      } else if (source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = false;
        afterQuote = true;
      }
    } else if (character === delimiter) {
      closeField();
    } else if (afterQuote) {
      if (character !== ' ' && character !== '\t') throw new Error(`Unexpected character after a closing quote on line ${line}.`);
    } else if (character === '"') {
      if (field.trim()) throw new Error(`Unexpected quote on line ${line}. Quote the full value when it contains a delimiter.`);
      quoted = true;
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error(`A quoted value starting on line ${startLine} is missing its closing quote.`);
  if (field || cells.length || afterQuote) closeRecord();
  return { delimiter, records };
}

export function writeCsv(records, delimiter = ',') {
  function encode(value) {
    const text = String(value ?? '');
    // Keep pasted text from becoming formulas in a spreadsheet.
    const literal = /^\s*[=+@\uFF1D\uFF0B\uFF20\uFF0D-]/u.test(text) ? "'" + text : text;
    return `"${literal.replaceAll('"', '""')}"`;
  }
  return '\ufeff' + records.map(cells => cells.map(encode).join(delimiter)).join('\r\n') + '\r\n';
}
