// Placeholder — generate from Supabase after running migrations:
// supabase gen types typescript --linked > types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "user";
  is_active: boolean;
};
