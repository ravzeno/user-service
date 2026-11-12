import { Logger, type INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import type { Request, Response } from "express";
import { auth } from "./lib/auth.js";

function getPublicBasePath() {
  const basePath = process.env.API_DOCS_BASE_PATH?.trim().replace(
    /^\/+|\/+$/g,
    "",
  );
  return basePath ? `/${basePath}` : "";
}

export async function setupApiDocs(app: INestApplication) {
  const publicBasePath = getPublicBasePath();
  const { authCookies } = await auth.$context;
  const config = new DocumentBuilder()
    .setTitle("User Service API")
    .setVersion("0.1.0")
    .addCookieAuth(
      authCookies.sessionToken.name,
      { type: "apiKey", in: "cookie" },
      "session",
    )
    .addApiKey(
      { type: "apiKey", in: "header", name: "x-api-key" },
      "internalApiKey",
    )
    .addServer(publicBasePath || "/")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  app
    .getHttpAdapter()
    .getInstance()
    .get("/api/docs/json", (_request: Request, response: Response) =>
      response.json(document),
    );
  app.use("/api/docs", apiReference({ content: document }));

  Logger.log("User Service API documentation: /api/docs", "Bootstrap");
}

export async function setupBetterAuthDocs(app: INestApplication) {
  const publicBasePath = getPublicBasePath();
  const document = await auth.api.generateOpenAPISchema();
  document.servers = [{ url: `${publicBasePath}/api/auth` }];
  const sessionSchema =
    document.paths["/get-session"]?.get?.responses?.["200"]?.content?.[
      "application/json"
    ]?.schema;
  if (sessionSchema?.properties) {
    sessionSchema.properties.user = {
      allOf: [
        { $ref: "#/components/schemas/User" },
        {
          type: "object",
          properties: {
            permissions: {
              type: "array",
              items: { type: "string" },
              description: "Effective permissions from active groups.",
            },
          },
          required: ["permissions"],
        },
      ],
    };
  }

  app.use("/api/auth/docs/json", (_request: Request, response: Response) =>
    response.json(document),
  );
  app.use("/api/auth/docs", apiReference({ content: document }));

  Logger.log("Better Auth documentation: /api/auth/docs", "Bootstrap");
}
