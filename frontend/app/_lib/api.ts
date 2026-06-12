const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://paylens-backend.vercel.app';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('paylens_token');
}

export function saveToken(token: string) {
  localStorage.setItem('paylens_token', token);
}

export function clearToken() {
  localStorage.removeItem('paylens_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Do not set Content-Type if we're uploading files (let browser set multipart/form-data boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${cleanBase}${cleanPath}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  // Handle case where response might not be JSON (e.g. text/empty)
  const contentType = res.headers.get('content-type');
  let data: any;
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { message: await res.text() };
  }

  if (!res.ok) throw new Error(data.message ?? 'Request failed');
  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: 'GET', ...options }),
  post: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  put: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: 'DELETE', ...options }),
};

