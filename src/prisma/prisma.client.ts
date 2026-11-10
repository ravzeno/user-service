import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
export const PRISMA_CLIENT = Symbol("PRISMA_CLIENT");
