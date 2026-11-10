import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import express from "express";

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    if (request.url.startsWith("/api/auth")) {
      next();
      return;
    }

    express.json()(request, response, (jsonError) => {
      if (jsonError) {
        next(jsonError);
        return;
      }
      express.urlencoded({ extended: true })(request, response, next);
    });
  }
}
