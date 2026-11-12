import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { openAPI } from "better-auth/plugins";
import { prisma } from "../prisma/prisma.client.js";
import { sendAuthEmail } from "./email/mail.js";
import { lineOAuthPlugins } from "./plugin/index.js";

const developmentSecret =
  "local-development-secret-change-before-deploying-000000";
const authSecret = process.env.BETTER_AUTH_SECRET;
if (
  process.env.NODE_ENV === "production" &&
  (!authSecret ||
    authSecret.length < 32 ||
    authSecret.toLowerCase().includes("replace-with") ||
    authSecret === developmentSecret)
) {
  throw new Error(
    "BETTER_AUTH_SECRET must be a random, non-placeholder value of at least 32 characters in production",
  );
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const trustedOrigins = (
  process.env.TRUSTED_ORIGINS || "http://localhost:3000,http://localhost:3001"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: "User Service",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  basePath: "/api/auth",
  secret: authSecret || developmentSecret,
  trustedOrigins,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {},
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail(user.email, "Reset your password", url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail(user.email, "Verify your email address", url);
    },
  },
  user: {
    additionalFields: {
      phoneNumber: { type: "string", required: false, input: true },
      role: { type: "string", required: false, input: false },
    },
  },
  plugins: [
    ...lineOAuthPlugins,
    ...(process.env.ENABLE_API_DOCS === "true"
      ? [openAPI({ disableDefaultReference: true })]
      : []),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!user.email) {
            throw new APIError("BAD_REQUEST", {
              message:
                "An email address is required. Enable email permission for the LINE Login channel.",
            });
          }
          const profileGroup = await prisma.group.findFirst({
            where: {
              slug: "customer-profile-access",
              isSystem: true,
              active: true,
              deletedAt: null,
            },
            select: { id: true },
          });
          if (!profileGroup) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Account registration is temporarily unavailable.",
            });
          }
          return { data: user };
        },
        after: async (user) => {
          const customerGroup = await prisma.group.findFirst({
            where: {
              slug: "customer-profile-access",
              isSystem: true,
              active: true,
              deletedAt: null,
            },
            select: { id: true },
          });
          if (customerGroup) {
            await prisma.userGroup.createMany({
              data: [{ userId: user.id, groupId: customerGroup.id }],
              skipDuplicates: true,
            });
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { deletedAt: true, banned: true, banExpires: true },
          });
          const banExpired =
            !!user?.banExpires && user.banExpires <= new Date();
          if (!user || user.deletedAt || (user.banned && !banExpired)) {
            throw new APIError("FORBIDDEN", {
              message: "This account is unavailable.",
            });
          }
          return { data: session };
        },
      },
    },
  },
});
