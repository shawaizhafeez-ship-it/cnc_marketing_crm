import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const ALLOWED_DOMAIN = "cncservices.net";
const DOMAIN_REGEX = /^[a-zA-Z0-9._%+-]+@cncservices\.net$/i;

const REJECT_MESSAGE =
  "Only @cncservices.net email addresses are allowed to sign up. Contact your administrator for access.";

function isAllowedEmail(email: string): boolean {
  return DOMAIN_REGEX.test(email.trim().toLowerCase());
}

function rejectSignup(message: string, httpCode = 403): Response {
  // Return 200 with error body — Supabase auth hooks read rejection from body
  // when status is 200/202 (see Supabase auth hooks error handling docs)
  return new Response(
    JSON.stringify({
      error: {
        message,
        http_code: httpCode,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function allowSignup(): Response {
  return new Response("{}", {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: { message: "Method not allowed" } }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await req.text();
  const secret = Deno.env.get("BEFORE_USER_CREATED_HOOK_SECRET")?.replace(
    "v1,whsec_",
    ""
  );

  if (!secret) {
    console.error("BEFORE_USER_CREATED_HOOK_SECRET is not configured");
    return rejectSignup("Auth hook misconfigured. Contact administrator.", 500);
  }

  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(secret);

  try {
    const { user } = wh.verify(payload, headers) as {
      user: { email?: string };
    };

    const email = user?.email?.trim().toLowerCase() ?? "";

    if (!email) {
      return rejectSignup("An email address is required to create an account.");
    }

    if (!isAllowedEmail(email)) {
      console.log(`Rejected signup attempt: ${email}`);
      return rejectSignup(REJECT_MESSAGE, 403);
    }

    const domain = email.split("@")[1];
    if (domain !== ALLOWED_DOMAIN) {
      return rejectSignup(REJECT_MESSAGE, 403);
    }

    console.log(`Allowed signup: ${email}`);
    return allowSignup();
  } catch (error) {
    console.error("Hook verification failed:", error);
    return new Response(
      JSON.stringify({
        error: {
          message: "Invalid hook request",
          http_code: 401,
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
