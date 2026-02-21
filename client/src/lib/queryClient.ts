import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * queryKey formatları:
 *  - ["/api/tickets"]
 *  - ["/api/chat/messages", { groupId: "..." }]
 *  - ["/api/events", "123"]  -> "/api/events/123"
 */
function buildUrlFromQueryKey(queryKey: readonly unknown[]): string {
  const [base, ...rest] = queryKey;

  if (typeof base !== "string") {
    throw new Error("Invalid queryKey: first item must be a string URL");
  }

  // Son eleman object ise querystring kabul et (örn: { groupId })
  const last = rest.length ? rest[rest.length - 1] : undefined;
  const hasQueryObject =
    last &&
    typeof last === "object" &&
    !Array.isArray(last) &&
    !(last instanceof Date);

  const pathParts = hasQueryObject ? rest.slice(0, -1) : rest;

  // "/api/events", "123" => "/api/events/123"
  const path = [base, ...pathParts]
    .filter((p) => p !== undefined && p !== null && p !== "")
    .map((p) => encodeURIComponent(String(p)))
    // base zaten "/api/..." gibi slash’li, encode ettik; geri düzelt:
    .join("/")
    .replace(/%2F/g, "/"); // "/api" gibi parçaları bozmayalım

  if (!hasQueryObject) return path;

  const paramsObj = last as Record<string, unknown>;
  const sp = new URLSearchParams();

  for (const [k, v] of Object.entries(paramsObj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      v.forEach((item) => sp.append(k, String(item)));
    } else {
      sp.set(k, String(v));
    }
  }

  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      Accept: "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    cache: "no-store",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn =
  <T>(options: { on401: UnauthorizedBehavior }): QueryFunction<T> =>
  async ({ queryKey }) => {
    const url = buildUrlFromQueryKey(queryKey);

    const res = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (options.on401 === "returnNull" && res.status === 401) {
      return null as any;
    }

    await throwIfResNotOk(res);

    // JSON değilse patlamasın (bazı endpointler boş dönebiliyor)
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return (await res.text()) as any;
    }

    return (await res.json()) as T;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
