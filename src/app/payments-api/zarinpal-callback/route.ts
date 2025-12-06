import { type NextRequest } from "next/server";
import { env } from "~/env.mjs";
import { supabase } from "~/server/supabase/supabaseClient";

export const runtime = "nodejs";

const baseZarinpalUrl = env.ZARINPAL_SANDBOX
  ? "https://sandbox.zarinpal.com"
  : "https://api.zarinpal.com";

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const authority = searchParams.get("Authority");
  const status = searchParams.get("Status");
  const userId = searchParams.get("userId");

  if (!authority || !status || !userId) {
    return new Response("Invalid callback", { status: 400 });
  }

  if (status !== "OK") {
    return Response.redirect(`${env.ZARINPAL_FAILURE_REDIRECT}?authority=${authority}`);
  }

  const verificationResponse = await fetch(
    `${baseZarinpalUrl}/pg/v4/payment/verify.json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: env.ZARINPAL_MERCHANT_ID,
        amount: env.ZARINPAL_AMOUNT,
        authority,
      }),
    },
  );

  const verificationJson = (await verificationResponse.json()) as ZarinpalVerificationResponse;

  if (!verificationJson.data || ![100, 101].includes(verificationJson.data.code)) {
    return Response.redirect(
      `${env.ZARINPAL_FAILURE_REDIRECT}?authority=${authority}&code=${verificationJson.errors?.[0]?.code ?? verificationJson.data?.code ?? ""}`,
    );
  }

  const renewDate = new Date(
    Date.now() + env.ZARINPAL_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const supabaseClient = supabase();

  if (!("from" in supabaseClient)) {
    return new Response("Supabase client unavailable", { status: 500 });
  }

  const { error } = await supabaseClient
    .from("subscriptions")
    .upsert({
      ends_at: renewDate,
      json_data: JSON.stringify(verificationJson),
      lemon_squeezy_id: authority,
      renews_at: renewDate,
      status: "paid",
      update_payment_url: env.ZARINPAL_PAYMENT_PORTAL_URL,
      profile_id: userId,
    });

  if (error) {
    console.error(JSON.stringify(error));
    return new Response("Failed to persist subscription", { status: 500 });
  }

  const successUrl = new URL(env.ZARINPAL_SUCCESS_REDIRECT);

  const referenceId =
    verificationJson.data.ref_id?.toString() ??
    verificationJson.data.RefID?.toString() ??
    verificationJson.data.card_pan ??
    authority;

  successUrl.searchParams.set("refId", referenceId);

  return Response.redirect(successUrl.toString());
};

type ZarinpalVerificationResponse = {
  data?: {
    code: number;
    message?: string;
    card_pan?: string;
    ref_id?: number;
    RefID?: number;
  };
  errors?: Array<{ code: number; message: string }>;
};
