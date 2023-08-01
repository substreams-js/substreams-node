import type { Interceptor } from "@bufbuild/connect";

export function createHeadersInterceptor(headers: any): Interceptor {
  return (next) => async (req) => {
    for (const header in headers) {
      req.header.set(header, headers[header]);
    }
    return next(req);
  };
}
