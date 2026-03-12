import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_API = "https://api.stripe.com/v1";

function formEncode(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

async function stripePost(path: string, body: Record<string, string>, secretKey: string) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(secretKey + ":")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formEncode(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Stripe error ${res.status}`);
  return data;
}

async function stripeGet(path: string, secretKey: string) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Basic ${btoa(secretKey + ":")}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Stripe error ${res.status}`);
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_MONTHLY_PRICE_ID = Deno.env.get("STRIPE_MONTHLY_PRICE_ID");
    const STRIPE_ANNUAL_PRICE_ID = Deno.env.get("STRIPE_ANNUAL_PRICE_ID");

    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");
    if (!STRIPE_MONTHLY_PRICE_ID) throw new Error("STRIPE_MONTHLY_PRICE_ID not configured");
    if (!STRIPE_ANNUAL_PRICE_ID) throw new Error("STRIPE_ANNUAL_PRICE_ID not configured");

    // Authenticate request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { plan, returnUrl } = await req.json() as { plan: string; returnUrl: string };
    if (!plan || !returnUrl) throw new Error("plan and returnUrl are required");

    const priceId = plan === "annual" ? STRIPE_ANNUAL_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;

    // Get user profile for Stripe customer
    const { data: profile } = await supabase
      .from("users")
      .select("stripe_customer_id, email, name")
      .eq("id", user.id)
      .single();

    // Get or create Stripe customer
    let stripeCustomerId = profile?.stripe_customer_id as string | null;

    if (!stripeCustomerId) {
      const customer = await stripePost("/customers", {
        email: profile?.email ?? user.email ?? "",
        name: profile?.name ?? "",
        "metadata[user_id]": user.id,
      }, STRIPE_SECRET_KEY);

      stripeCustomerId = customer.id;

      await supabase
        .from("users")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);
    } else {
      // Verify customer still exists in Stripe
      try {
        await stripeGet(`/customers/${stripeCustomerId}`, STRIPE_SECRET_KEY);
      } catch {
        // Customer deleted from Stripe — create a fresh one
        const customer = await stripePost("/customers", {
          email: profile?.email ?? user.email ?? "",
          name: profile?.name ?? "",
          "metadata[user_id]": user.id,
        }, STRIPE_SECRET_KEY);
        stripeCustomerId = customer.id;
        await supabase
          .from("users")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", user.id);
      }
    }

    // Create Stripe Checkout Session
    const session = await stripePost("/checkout/sessions", {
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${returnUrl}?upgraded=true`,
      cancel_url: returnUrl,
      customer: stripeCustomerId!,
      client_reference_id: user.id,
    }, STRIPE_SECRET_KEY);

    return new Response(
      JSON.stringify({ success: true, url: session.url }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[create-checkout-session] Error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
