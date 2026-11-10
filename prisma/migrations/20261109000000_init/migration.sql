CREATE TABLE "user" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "image" TEXT,
  "phoneNumber" TEXT,
  "role" TEXT NOT NULL DEFAULT 'customer',
  "banned" BOOLEAN NOT NULL DEFAULT false,
  "banReason" TEXT,
  "banExpires" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "user_phoneNumber_key" ON "user"("phoneNumber");
CREATE INDEX "user_deletedAt_createdAt_idx" ON "user"("deletedAt", "createdAt");
CREATE INDEX "user_name_idx" ON "user"("name");

CREATE TABLE "session" (
  "id" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "token" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL,
  "impersonatedBy" TEXT,
  CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
CREATE INDEX "session_userId_idx" ON "session"("userId");

CREATE TABLE "account" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");
CREATE INDEX "account_userId_idx" ON "account"("userId");

CREATE TABLE "verification" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

CREATE TABLE "group" (
  "id" TEXT NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" VARCHAR(500),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "group_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "group_slug_key" ON "group"("slug");
CREATE INDEX "group_deletedAt_active_idx" ON "group"("deletedAt", "active");

CREATE TABLE "user_group" (
  "userId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  CONSTRAINT "user_group_pkey" PRIMARY KEY ("userId", "groupId")
);
CREATE INDEX "user_group_groupId_idx" ON "user_group"("groupId");

CREATE TABLE "group_permission" (
  "groupId" TEXT NOT NULL,
  "permission" VARCHAR(120) NOT NULL,
  CONSTRAINT "group_permission_pkey" PRIMARY KEY ("groupId", "permission")
);

CREATE TABLE "permission" (
  "key" VARCHAR(120) NOT NULL,
  "description" VARCHAR(255) NOT NULL,
  "appName" VARCHAR(100) NOT NULL DEFAULT 'core',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "permission_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "audit_log" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" VARCHAR(120) NOT NULL,
  "targetId" VARCHAR(120),
  "metadata" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_log_actorId_createdAt_idx" ON "audit_log"("actorId", "createdAt");
CREATE INDEX "audit_log_action_createdAt_idx" ON "audit_log"("action", "createdAt");

ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_permission" ADD CONSTRAINT "group_permission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
