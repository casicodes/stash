type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

type RequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
};

type ApiError = {
  message: string;
  status: number;
  code?: string;
};

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export async function httpClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", headers = {}, body, signal } = options;

  try {
    const response = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    const data = await parseResponse<T>(response);

    if (!response.ok) {
      const errorMessage =
        (data as { error?: string })?.error ??
        `Request failed with status ${response.status}`;

      return {
        success: false,
        error: {
          message: errorMessage,
          status: response.status,
          code: (data as { code?: string })?.code,
        },
      };
    }

    return { success: true, data };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: {
          message: "Request was cancelled",
          status: 0,
          code: "ABORTED",
        },
      };
    }

    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Network error",
        status: 0,
        code: "NETWORK_ERROR",
      },
    };
  }
}
