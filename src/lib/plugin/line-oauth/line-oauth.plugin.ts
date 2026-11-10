import { genericOAuth, line } from "better-auth/plugins/generic-oauth";

const lineClientId = process.env.LINE_CLIENT_ID;
const lineClientSecret = process.env.LINE_CLIENT_SECRET;

export const lineOAuthPlugins =
  lineClientId && lineClientSecret
    ? [
        genericOAuth({
          config: [
            line({
              clientId: lineClientId,
              clientSecret: lineClientSecret,
              providerId: "line",
            }),
          ],
        }),
      ]
    : [];
