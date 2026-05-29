import type { paths } from "./openapi";

export type Path = keyof paths;
export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

// Helper types to extract operation details from generated OpenAPI spec
type Operation<P extends Path, M extends HttpMethod> = M extends keyof paths[P]
  ? paths[P][M]
  : never;

type Params<P extends Path, M extends HttpMethod> =
  Operation<P, M> extends { parameters?: infer T } ? T : never;

type PathParams<P extends Path, M extends HttpMethod> =
  Params<P, M> extends { path?: infer T } ? T : never;

type QueryParams<P extends Path, M extends HttpMethod> =
  Params<P, M> extends { query?: infer T } ? T : never;

type ReqBody<P extends Path, M extends HttpMethod> =
  Operation<P, M> extends {
    requestBody?: { content: { "application/json": infer T } };
  }
    ? T
    : never;

type ResponseContent<P extends Path, M extends HttpMethod> =
  Operation<P, M> extends {
    responses: infer R;
  }
    ? R extends { 200: { content: { "application/json": infer T } } }
      ? T
      : R extends { 201: { content: { "application/json": infer T } } }
        ? T
        : undefined
    : undefined;

let apiBaseUrl = "";
let getSharedHeaders: () => Record<string, string> = (): Record<string, string> => ({});

export function configureApiClient(config: {
  baseUrl?: string;
  getHeaders?: () => Record<string, string>;
}): void {
  if (config.baseUrl !== undefined) {
    apiBaseUrl = config.baseUrl;
  }
  if (config.getHeaders !== undefined) {
    getSharedHeaders = config.getHeaders;
  }
}

async function request<P extends Path, M extends HttpMethod>(
  method: M,
  path: P,
  options: {
    params?: PathParams<P, M>;
    query?: QueryParams<P, M>;
    body?: ReqBody<P, M>;
    headers?: Record<string, string>;
  } = {},
): Promise<ResponseContent<P, M>> {
  // Replace path parameters, e.g. /api/rooms/{id} -> /api/rooms/123
  let urlPath: string = path;
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      urlPath = urlPath.replace(`{${key}}`, String(value));
    }
  }

  // Construct final URL
  let urlString = urlPath;
  if (apiBaseUrl) {
    // If apiBaseUrl ends with '/' and urlPath starts with '/', join correctly
    const base = apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
    const rel = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
    urlString = `${base}${rel}`;
  }

  const url = new URL(
    urlString,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }
  }

  const mergedHeaders = {
    "Content-Type": "application/json",
    ...getSharedHeaders(),
    ...options.headers,
  };

  const response = await fetch(url.toString(), {
    method: method.toUpperCase(),
    headers: mergedHeaders,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        const pathname = window.location.pathname;
        if (pathname !== "/login" && pathname !== "/register" && pathname !== "/") {
          localStorage.removeItem("gestao_casa_auth_token");
          localStorage.removeItem("gestao_casa_user_id");
          window.location.href = "/login";
        }
      }
    }
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      // Ignore parsing errors on failed requests without JSON bodies
    }
    const message =
      (errorData as { error?: string })?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  // Check if content length is 0 or status is 204
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as unknown as ResponseContent<P, M>;
  }

  try {
    const json = await response.json();
    return json as ResponseContent<P, M>;
  } catch {
    return undefined as unknown as ResponseContent<P, M>;
  }
}

export const apiClient = {
  get<P extends Path>(
    path: P,
    options?: {
      params?: PathParams<P, "get">;
      query?: QueryParams<P, "get">;
      headers?: Record<string, string>;
    },
  ): Promise<ResponseContent<P, "get">> {
    return request("get", path, options);
  },

  post<P extends Path>(
    path: P,
    options?: {
      params?: PathParams<P, "post">;
      query?: QueryParams<P, "post">;
      body?: ReqBody<P, "post">;
      headers?: Record<string, string>;
    },
  ): Promise<ResponseContent<P, "post">> {
    return request("post", path, options);
  },

  put<P extends Path>(
    path: P,
    options?: {
      params?: PathParams<P, "put">;
      query?: QueryParams<P, "put">;
      body?: ReqBody<P, "put">;
      headers?: Record<string, string>;
    },
  ): Promise<ResponseContent<P, "put">> {
    return request("put", path, options);
  },

  delete<P extends Path>(
    path: P,
    options?: {
      params?: PathParams<P, "delete">;
      query?: QueryParams<P, "delete">;
      body?: ReqBody<P, "delete">;
      headers?: Record<string, string>;
    },
  ): Promise<ResponseContent<P, "delete">> {
    return request("delete", path, options);
  },
};
