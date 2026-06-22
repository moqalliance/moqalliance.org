import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "ok" | "invalid" | "error" | "rate_limited";

function respond(
	wantsJson: boolean,
	status: Status,
	httpStatus = 200,
): Response {
	if (wantsJson) {
		return new Response(JSON.stringify({ status }), {
			status: httpStatus,
			headers: { "Content-Type": "application/json" },
		});
	}
	return new Response(null, {
		status: 303,
		headers: { Location: `/?subscribed=${status}` },
	});
}

export const POST: APIRoute = async ({ request }) => {
	const wantsJson = (request.headers.get("accept") || "").includes(
		"application/json",
	);

	const ip =
		request.headers.get("cf-connecting-ip") ||
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		"";

	const limiter = (
		env as unknown as {
			SUBSCRIBE_LIMITER?: {
				limit: (opts: { key: string }) => Promise<{ success: boolean }>;
			};
		}
	).SUBSCRIBE_LIMITER;
	if (limiter && ip) {
		try {
			const { success } = await limiter.limit({ key: ip });
			if (!success) {
				return respond(wantsJson, "rate_limited", 429);
			}
		} catch (err) {
			// Fail open on limiter errors — don't block legitimate signups
			// because the rate limit infra hiccuped.
			console.error("Rate limiter check failed:", err);
		}
	}

	let email = "";
	try {
		const form = await request.formData();
		email = String(form.get("email") ?? "").trim().toLowerCase();
	} catch {
		return respond(wantsJson, "invalid", 400);
	}

	if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
		return respond(wantsJson, "invalid", 400);
	}

	const cf = (request as unknown as { cf?: Record<string, unknown> }).cf ?? {};
	const country = typeof cf.country === "string" ? cf.country : "";
	const region = typeof cf.region === "string" ? cf.region : "";
	const city = typeof cf.city === "string" ? cf.city : "";

	const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 500);

	const db = (env as unknown as { DB: D1Database }).DB;
	if (!db) {
		console.error("D1 binding DB is missing");
		return respond(wantsJson, "error", 500);
	}

	try {
		await db
			.prepare(
				`INSERT INTO signups (email, ip_address, country, region, city, user_agent)
				 VALUES (?, ?, ?, ?, ?, ?)
				 ON CONFLICT(email) DO NOTHING`,
			)
			.bind(email, ip, country, region, city, userAgent)
			.run();
	} catch (err) {
		console.error("Failed to record signup:", err);
		return respond(wantsJson, "error", 500);
	}

	return respond(wantsJson, "ok", 200);
};
