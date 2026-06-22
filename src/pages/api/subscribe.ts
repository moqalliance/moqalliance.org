import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function redirect(target: string): Response {
	return new Response(null, {
		status: 303,
		headers: { Location: target },
	});
}

export const POST: APIRoute = async ({ request }) => {
	let email = "";
	try {
		const form = await request.formData();
		email = String(form.get("email") ?? "").trim().toLowerCase();
	} catch {
		return redirect("/?subscribed=invalid");
	}

	if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
		return redirect("/?subscribed=invalid");
	}

	const ip =
		request.headers.get("cf-connecting-ip") ||
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		"";

	// Cloudflare attaches geolocation to the request via the cf object.
	const cf = (request as unknown as { cf?: Record<string, unknown> }).cf ?? {};
	const country = typeof cf.country === "string" ? cf.country : "";
	const region = typeof cf.region === "string" ? cf.region : "";
	const city = typeof cf.city === "string" ? cf.city : "";

	const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 500);

	const db = (env as unknown as { DB: D1Database }).DB;
	if (!db) {
		console.error("D1 binding DB is missing");
		return redirect("/?subscribed=error");
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
		return redirect("/?subscribed=error");
	}

	return redirect("/?subscribed=ok");
};
