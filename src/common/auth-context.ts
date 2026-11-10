import type { Session, User } from "better-auth";

export interface AuthContext {
  session: Session;
  user: User;
}
