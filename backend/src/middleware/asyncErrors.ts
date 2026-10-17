import { NextFunction, Request, Response } from "express";

// Express 4 does not forward rejected promises from async handlers to the error middleware.
// Without this, any failing await (OpenAI, Stripe, Firestore) leaves the request hanging or
// crashes the process with an unhandled rejection. This patches the router layer once so every
// async route handler forwards its errors to next().
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Layer = require("express/lib/router/layer");

let patched = false;

export function enableAsyncRouteErrors() {
  if (patched) {
    return;
  }

  const originalHandleRequest = Layer.prototype.handle_request;
  Layer.prototype.handle_request = function handleRequest(req: Request, res: Response, next: NextFunction) {
    const handler = this.handle;
    if (typeof handler !== "function" || handler.length > 3) {
      return originalHandleRequest.call(this, req, res, next);
    }

    try {
      const result = handler(req, res, next);
      if (result && typeof result.then === "function") {
        result.then(undefined, next);
      }
    } catch (error) {
      next(error);
    }
  };
  patched = true;
}

export function apiErrorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const statusCode =
    typeof (error as { statusCode?: unknown })?.statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : typeof (error as { status?: unknown })?.status === "number"
        ? (error as { status: number }).status
        : 500;
  const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
  const message =
    error instanceof Error && error.message
      ? safeStatus >= 500 && safeStatus !== 502 && safeStatus !== 503
        ? "Something went wrong on the server. Please try again."
        : error.message
      : "Something went wrong on the server. Please try again.";

  if (safeStatus >= 500) {
    console.error("API request failed", error);
  }

  if (res.headersSent) {
    return;
  }

  res.status(safeStatus).json({ message });
}
