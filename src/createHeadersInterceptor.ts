import type { Interceptor } from "@connectrpc/connect";

export function createHeadersInterceptor(headers?: Headers): Interceptor {
  return (next) => async (req) => {
    for (const header in headers?.entries()) {
      const [key, value] = header;
      req.header.set(key, value);
    }
    return next(req);
  };
}
