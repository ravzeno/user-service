import { Module } from "@nestjs/common";
import { auth } from "../../lib/auth.js";

export const BETTER_AUTH = Symbol("BETTER_AUTH");

@Module({
  providers: [{ provide: BETTER_AUTH, useValue: auth }],
  exports: [BETTER_AUTH],
})
export class AuthModule {}
