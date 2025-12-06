import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (str) => !str.includes("YOUR_MYSQL_URL_HERE"),
        "You forgot to change the default URL",
      ),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SUPABASE_SERVICE_KEY: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    ZARINPAL_MERCHANT_ID: z.string().min(1),
    ZARINPAL_CALLBACK_URL: z.string().url(),
    ZARINPAL_AMOUNT: z.coerce.number(),
    ZARINPAL_SANDBOX: z.coerce.boolean().default(false),
    ZARINPAL_SUCCESS_REDIRECT: z.string().url(),
    ZARINPAL_FAILURE_REDIRECT: z.string().url(),
    ZARINPAL_SUBSCRIPTION_DAYS: z.coerce.number().default(30),
    ZARINPAL_PAYMENT_PORTAL_URL: z.string().url(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: z.string().optional(),
    NEXT_PUBLIC_UMAMI_URL: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    DIRECT_URL: process.env.DIRECT_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
    NEXT_PUBLIC_UMAMI_URL: process.env.NEXT_PUBLIC_UMAMI_URL,
    ZARINPAL_MERCHANT_ID: process.env.ZARINPAL_MERCHANT_ID,
    ZARINPAL_CALLBACK_URL: process.env.ZARINPAL_CALLBACK_URL,
    ZARINPAL_AMOUNT: process.env.ZARINPAL_AMOUNT,
    ZARINPAL_SANDBOX: process.env.ZARINPAL_SANDBOX,
    ZARINPAL_SUCCESS_REDIRECT: process.env.ZARINPAL_SUCCESS_REDIRECT,
    ZARINPAL_FAILURE_REDIRECT: process.env.ZARINPAL_FAILURE_REDIRECT,
    ZARINPAL_SUBSCRIPTION_DAYS: process.env.ZARINPAL_SUBSCRIPTION_DAYS,
    ZARINPAL_PAYMENT_PORTAL_URL: process.env.ZARINPAL_PAYMENT_PORTAL_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
