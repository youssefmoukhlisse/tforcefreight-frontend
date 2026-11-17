const importKeys = new Map();
const validUuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function csvImportRetryId(namespace, userId, payload) {
  const scope = new TextEncoder().encode(String(userId) + '\n');
  const material = new Uint8Array(scope.length + payload.byteLength);
  material.set(scope);
  material.set(payload, scope.length);
  const hash = await crypto.subtle.digest('SHA-256', material);
  const fingerprint = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  const storageKey = namespace + ':' + fingerprint;

  let previous = importKeys.get(storageKey);
  try {
    previous ||= sessionStorage.getItem(storageKey);
  } catch {
    // A browser may block session storage. The in-page key still supports retry.
  }
  if (previous && validUuid.test(previous)) return previous;

  const id = crypto.randomUUID();
  try {
    sessionStorage.setItem(storageKey, id);
  } catch {
    importKeys.set(storageKey, id);
  }
  return id;
}

export async function decodeCsvFile(file, { maxBytes, emptyMessage }) {
  if (!(file instanceof File) || file.size === 0) throw new Error(emptyMessage);
  if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Choose a file with a .csv extension.');
  if (file.size > maxBytes) throw new Error('Choose a CSV file no larger than 1 MB.');
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    return { bytes, text };
  } catch {
    throw new Error('The file could not be read as UTF-8. Save it as CSV UTF-8 and try again.');
  }
}

export function downloadCsv(contents, filename) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
