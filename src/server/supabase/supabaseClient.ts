import { createClient, type Session, type User } from "@supabase/supabase-js";

import { type Database } from "./supabaseTypes";

import { env } from "~/env.mjs";

const LOCAL_AUTH_STORAGE_KEY = "feastqr-local-users";
const DEFAULT_LOCAL_USER = {
  id: "local-demo-user",
  email: "demo@example.com",
  password: "demo123",
};

type LocalUserShape = {
  id: string;
  email: string;
  created_at: string;
};

const encode = (value: string) =>
  typeof window === "undefined"
    ? Buffer.from(value).toString("base64")
    : btoa(value);

const decode = (value: string) =>
  typeof window === "undefined"
    ? Buffer.from(value, "base64").toString("utf8")
    : atob(value);

const createLocalUser = (user: LocalUserShape): User => ({
  app_metadata: {},
  aud: "authenticated",
  confirmation_sent_at: null,
  confirmation_token: "",
  confirmed_at: null,
  created_at: user.created_at,
  email: user.email,
  email_change_sent_at: null,
  email_change: null,
  email_change_token_new: "",
  email_confirmed_at: new Date().toISOString(),
  encrypted_password: "",
  factors: [],
  id: user.id,
  identities: [],
  invited_at: null,
  is_anonymous: false,
  last_sign_in_at: user.created_at,
  new_email: null,
  phone: "",
  phone_change: "",
  phone_change_sent_at: null,
  phone_confirmed_at: null,
  raw_app_meta_data: {},
  raw_user_meta_data: {},
  recovery_sent_at: null,
  recovery_token: "",
  role: "authenticated",
  updated_at: new Date().toISOString(),
  user_metadata: {},
});

const createLocalSession = (user: User): Session => {
  const access_token = encode(JSON.stringify({ id: user.id, email: user.email }));
  const expires_at = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;

  return {
    access_token,
    refresh_token: access_token,
    expires_at,
    expires_in: expires_at - Math.floor(Date.now() / 1000),
    provider_token: access_token,
    provider_refresh_token: access_token,
    token_type: "bearer",
    user,
  };
};

type LocalStoredUser = { email: string; password: string; id: string };

const readLocalUsers = (): LocalStoredUser[] => {
  if (typeof localStorage !== "undefined") {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_AUTH_STORAGE_KEY) ?? "null");

      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      console.error("Unable to parse local users", error);
    }
  }

  // Fallback to default user when nothing exists
  return [DEFAULT_LOCAL_USER];
};

const writeLocalUsers = (users: LocalStoredUser[]) => {
  if (typeof localStorage === "undefined") return;

  localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, JSON.stringify(users));
};

const getLocalUserByEmail = (email: string) =>
  readLocalUsers().find((user) => user.email.toLowerCase() === email.toLowerCase());

const blobToDataUrl = async (blob: Blob) => {
  if (typeof window === "undefined") {
    const buffer = Buffer.from(await blob.arrayBuffer());
    return `data:${blob.type};base64,${buffer.toString("base64")}`;
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

class LocalSupabaseClient {
  private listeners = new Set<(event: string, session: Session | null) => void>();

  private emit(event: string, session: Session | null) {
    this.listeners.forEach((listener) => listener(event, session));
  }

  auth = {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const existing = getLocalUserByEmail(email);

      if (!existing || existing.password !== password) {
        return { data: { session: null, user: null }, error: new Error("Invalid credentials") };
      }

      const user = createLocalUser({ id: existing.id, email, created_at: new Date().toISOString() });
      const session = createLocalSession(user);

      this.emit("SIGNED_IN", session);

      return { data: { session, user }, error: null };
    },
    signUp: async ({ email, password }: { email: string; password: string }) => {
      const users = readLocalUsers();

      if (getLocalUserByEmail(email)) {
        return { data: { session: null, user: null }, error: new Error("User already exists") };
      }

      users.push({ email, password, id: crypto.randomUUID() });
      writeLocalUsers(users);

      const user = createLocalUser({ id: users[users.length - 1].id, email, created_at: new Date().toISOString() });
      const session = createLocalSession(user);

      this.emit("SIGNED_IN", session);

      return { data: { session, user }, error: null };
    },
    signOut: async () => {
      this.emit("SIGNED_OUT", null);

      return { error: null };
    },
    signInWithOAuth: async () => ({ data: { session: null, user: null }, error: new Error("OAuth is disabled in local mode") }),
    getSession: async () => {
      const cookies = typeof document === "undefined" ? "" : document.cookie;
      const access = cookies
        .split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith("access-token="))
        ?.split("=")[1];

      if (!access) return { data: { session: null }, error: null };

      return this.auth.setSession({ access_token: access, refresh_token: access });
    },
    setSession: async ({ access_token, refresh_token }: { access_token: string; refresh_token: string }) => {
      try {
        const payload = JSON.parse(decode(access_token)) as { id: string; email: string };
        const user = createLocalUser({ id: payload.id, email: payload.email, created_at: new Date().toISOString() });
        const session = createLocalSession(user);

        return { data: { session, user }, error: null };
      } catch (error) {
        console.error("Invalid local session token", error);
        return { data: { session: null, user: null }, error };
      }
    },
    onAuthStateChange: (
      callback: (event: string, session: Session | null) => void,
    ) => {
      this.listeners.add(callback);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.listeners.delete(callback);
            },
          },
        },
        error: null,
      };
    },
    resetPasswordForEmail: async () => ({ data: { session: null }, error: null }),
    updateUser: async ({ password }: { password?: string }) => {
      if (!password || typeof localStorage === "undefined") {
        return { data: { user: null }, error: null };
      }

      const session = await this.auth.getSession();

      if (!session.data.session?.user.email) {
        return { data: { user: null }, error: new Error("No active user") };
      }

      const users = readLocalUsers();
      const idx = users.findIndex(
        (user) => user.email.toLowerCase() === session.data.session?.user.email?.toLowerCase(),
      );

      if (idx >= 0) {
        users[idx] = { ...users[idx], password };
        writeLocalUsers(users);
      }

      return { data: { user: session.data.session.user }, error: null };
    },
  };

  storage = {
    from: (_bucket: string) => ({
      upload: async (_path: string, file: Blob) => {
        const dataUrl = await blobToDataUrl(file);
        return { data: { path: dataUrl }, error: null };
      },
      createSignedUrl: async (path: string) => ({ data: { signedUrl: path }, error: null }),
    }),
  };

  from(_table: string) {
    const response = {
      data: null,
      error: new Error("Supabase database is unavailable in local mode."),
    } as const;

    let queryStub: any;

    queryStub = {
      select: async () => response,
      insert: async () => response,
      upsert: async () => response,
      update: async () => response,
      delete: async () => response,
      eq: () => queryStub,
      match: () => queryStub,
      single: async () => response,
    };

    return queryStub;
  }
}

const hasSupabaseEnv = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_KEY,
);

export const getServiceSupabase = () => {
  if (!hasSupabaseEnv) {
    throw new Error("Supabase environment variables are missing; using local auth instead.");
  }

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const clientSupabase =
  hasSupabaseEnv && env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : new LocalSupabaseClient();

const localSupabase = new LocalSupabaseClient();

export const supabase = () =>
  hasSupabaseEnv && typeof window !== "undefined" ? clientSupabase : hasSupabaseEnv ? getServiceSupabase() : localSupabase;

export const getUserAsAdmin = async (token: string) => {
  if (!hasSupabaseEnv) {
    try {
      const payload = JSON.parse(decode(token)) as { id: string; email: string };
      const user = createLocalUser({ id: payload.id, email: payload.email, created_at: new Date().toISOString() });

      return { user };
    } catch (error) {
      console.error("Unable to decode local user token", error);
      return { user: null };
    }
  }

  const { data, error } = await getServiceSupabase().auth.getUser(token);

  if (error) {
    console.error(error);
    throw error;
  }

  return data;
};

export const storageBucketsNames = {
  menus: "menus-files",
} as const;
