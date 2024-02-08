import type { Interceptor } from "@connectrpc/connect";

export function createAuthInterceptor(token: string) {
    const headers = new Headers({"X-Api-Key": token});
    return createHeadersInterceptor(headers)
}

export function defaultHeadersInterceptor() {
    const headers = new Headers({"X-User-Agent": "@substreams/node"});
    return createHeadersInterceptor(headers)
}

export function createHeadersInterceptor(headers: Headers): Interceptor {
  return (next) => async (req) => {
    for (const [key, value] of Array.from(headers)) {
      req.header.set(key, value);
    }
    return next(req);
  };
}

export function createInterceptors(token?: string, headers?: Headers) {
    const interceptors = [defaultHeadersInterceptor()];
    if (token) {
      interceptors.push(createAuthInterceptor(token));
    }
    if (headers) {
      interceptors.push(createHeadersInterceptor(headers));
    }
    return interceptors;
}