import { supabaseAdmin } from './supabase';

export type AuditActor = {
  id: string;
  email: string | null;
  displayName: string;
};

const UNAVAILABLE_ACTOR = 'Usuário indisponível';

export async function resolveAuditActors(
  userIds: string[]
): Promise<Record<string, AuditActor>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const actors: Record<string, AuditActor> = {};

  await Promise.all(
    unique.map(async (userId) => {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (error || !data?.user) {
          actors[userId] = { id: userId, email: null, displayName: UNAVAILABLE_ACTOR };
          return;
        }

        const email = data.user.email ?? null;
        const meta = data.user.user_metadata as Record<string, unknown> | undefined;
        const metaName =
          (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
          (typeof meta?.name === 'string' && meta.name.trim()) ||
          null;

        actors[userId] = {
          id: userId,
          email,
          displayName: metaName || email || UNAVAILABLE_ACTOR,
        };
      } catch {
        actors[userId] = { id: userId, email: null, displayName: UNAVAILABLE_ACTOR };
      }
    })
  );

  return actors;
}
