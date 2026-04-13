const API_BASE = '/api';

export async function api(endpoint, options = {}) {
  const { timeoutMs = 120000, ...requestOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(requestOptions.headers || {}),
      },
      ...requestOptions,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado tras ${timeoutMs}ms. Reintenta o cambia de modelo.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    const preview = raw.replace(/\s+/g, ' ').slice(0, 140);
    throw new Error(`La API devolvió respuesta no JSON (HTTP ${response.status}). Preview: ${preview}`);
  }

  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'La solicitud a la API falló.');
  }

  return data;
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('No se pudo convertir el archivo a base64.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });
}
