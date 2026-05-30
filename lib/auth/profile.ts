import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
};

export async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return (data as UserProfile | null) ?? null;
}

export function profileSetupSql(user: Pick<User, "id" | "email">): string {
  const name = user.email?.split("@")[0] ?? "User";
  return `INSERT INTO public.profiles (id, email, full_name, role, is_active)
VALUES ('${user.id}', '${user.email}', '${name}', 'admin', true)
ON CONFLICT (id) DO UPDATE
  SET is_active = true, role = EXCLUDED.role;`;
}

export async function createProfileForUser(
  user: Pick<User, "id" | "email" | "user_metadata">
): Promise<UserProfile> {
  if (!user.email) {
    throw new Error("User email is required to create a profile.");
  }

  const admin = createAdminClient();
  const fullName =
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null) ?? user.email.split("@")[0];

  const { data, error } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        full_name: fullName,
        role: "user",
        is_active: true,
      },
      { onConflict: "id" }
    )
    .select("id, email, full_name, role, is_active")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create profile row.");
  }

  return data as UserProfile;
}

export async function resolveUserProfile(
  user: User,
  options: { autoCreate?: boolean } = {}
): Promise<UserProfile | null> {
  const supabase = await createClient();
  const existing = await fetchUserProfile(supabase, user.id);

  if (existing) {
    return existing;
  }

  if (options.autoCreate) {
    try {
      return await createProfileForUser(user);
    } catch {
      return null;
    }
  }

  return null;
}
