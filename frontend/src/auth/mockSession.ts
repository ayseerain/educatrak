import { getMockState } from "@/api/mock";
import type { AuthenticatedUser, Role } from "@/lib/types";

/** Development-only identities backed by the central mock database. */
export const MOCK_USERS: Record<string, { password: string; user: AuthenticatedUser }> = Object.fromEntries(
  getMockState().frontendOnly.devCredentials.map((credential) => {
    const user = getMockState().staffUsers.find((candidate) => candidate.id === credential.userId)!;
    return [credential.username, { password: credential.password, user: { id: user.id, name: user.name, role: user.role as Role } }];
  }),
);

export const MOCK_USERS_BY_ROLE: Record<Role, AuthenticatedUser> = Object.values(MOCK_USERS).reduce(
  (usersByRole, { user }) => ({ ...usersByRole, [user.role]: user }),
  {} as Record<Role, AuthenticatedUser>,
);
