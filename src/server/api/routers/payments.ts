import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "~/env.mjs";
import { checkIfSubscribed } from "~/shared/hooks/useUserSubscription";
import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";

const baseZarinpalUrl = env.ZARINPAL_SANDBOX
  ? "https://sandbox.zarinpal.com"
  : "https://api.zarinpal.com";

const gatewayBaseUrl = env.ZARINPAL_SANDBOX
  ? "https://sandbox.zarinpal.com/pg/StartPay/"
  : "https://www.zarinpal.com/pg/StartPay/";

const createPremiumCheckoutSchema = z.object({
  language: z.enum(["fa", "en", "pl"]),
});

const checkoutTranslations: Record<"fa" | "en" | "pl", CheckoutCopy> = {
  fa: {
    description: "پرداخت اشتراک فست‌کیوآر برای مدیریت منوها.",
  },
  en: {
    description: "FeastQR subscription payment to manage your menus.",
  },
  pl: {
    description: "Płatność za subskrypcję FeastQR do zarządzania menu.",
  },
};

export const paymentsRouter = createTRPCRouter({
  createPremiumCheckout: privateProcedure
    .input(createPremiumCheckoutSchema)
    .mutation(async ({ ctx, input }) => {
      const language = input.language;
      const translations = checkoutTranslations[language];

      const callbackUrl = new URL(env.ZARINPAL_CALLBACK_URL);
      callbackUrl.searchParams.set("userId", ctx.user.id);

      const requestPayload: ZarinpalRequestBody = {
        merchant_id: env.ZARINPAL_MERCHANT_ID,
        amount: env.ZARINPAL_AMOUNT,
        description: translations.description,
        callback_url: callbackUrl.toString(),
        metadata: {
          email: ctx.user.email ?? undefined,
          order_id: ctx.user.id,
          language,
        },
      };

      const requestResponse = await fetch(
        `${baseZarinpalUrl}/pg/v4/payment/request.json`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        },
      );

      const requestJson = (await requestResponse.json()) as ZarinpalResponse;

      if (!requestJson.data || requestJson.data.code !== 100) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            requestJson.errors?.[0]?.message ?? "خطا در اتصال به زرین‌پال.",
        });
      }

      const authority = requestJson.data.authority;
      const now = new Date();
      const renewDate = new Date(
        now.getTime() + env.ZARINPAL_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000,
      );

      await ctx.db.subscriptions.upsert({
        where: { profileId: ctx.user.id },
        update: {
          endsAt: renewDate,
          renewsAt: renewDate,
          status: "pending",
          updatePaymentUrl: env.ZARINPAL_PAYMENT_PORTAL_URL,
          jsonData: requestPayload,
          paymentAuthority: authority,
        },
        create: {
          profileId: ctx.user.id,
          endsAt: renewDate,
          renewsAt: renewDate,
          status: "pending",
          updatePaymentUrl: env.ZARINPAL_PAYMENT_PORTAL_URL,
          jsonData: requestPayload,
          paymentAuthority: authority,
        },
      });

      return `${gatewayBaseUrl}${authority}`;
    }),
  cancelSubscription: privateProcedure.mutation(async ({ ctx }) => {
    const subscription = await ctx.db.subscriptions.findFirst({
      where: { profileId: ctx.user.id },
    });

    if (!subscription || !checkIfSubscribed(subscription.status)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Subscription not found or not active",
      });
    }

    await ctx.db.subscriptions.update({
      where: { profileId: ctx.user.id },
      data: {
        status: "cancelled",
        endsAt: new Date(),
      },
    });
  }),
  getSubscriptionInfo: privateProcedure.query(async ({ ctx }) => {
    return ctx.db.subscriptions.findFirst({
      where: {
        profileId: ctx.user.id,
      },
      select: {
        endsAt: true,
        renewsAt: true,
        status: true,
        updatePaymentUrl: true,
      },
    });
  }),
  getCustomerPortalUrl: privateProcedure.query(async ({ ctx }) => {
    const subscription = await ctx.db.subscriptions.findFirst({
      where: { profileId: ctx.user.id },
    });

    const isSubscribed = checkIfSubscribed(subscription?.status);

    if (!subscription || !isSubscribed) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Subscription not found or not active",
      });
    }

    return env.ZARINPAL_PAYMENT_PORTAL_URL;
  }),
});

type CheckoutCopy = {
  description: string;
};

type ZarinpalRequestBody = {
  merchant_id: string;
  amount: number;
  description: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
};

type ZarinpalResponse = {
  data?: {
    code: number;
    authority: string;
    fee_type?: string;
    fee?: number;
    message?: string;
  };
  errors?: Array<{ code: number; message: string }>;
};
