/**
 * Email Worker for hello@moqalliance.org.
 *
 * On every incoming message, POSTs a Discord webhook containing the
 * sender, subject, and message body so the team can triage from Discord.
 *
 * The Discord webhook URL must be set as a Worker secret named
 * DISCORD_WEBHOOK_URL via:
 *
 *   npx wrangler secret put DISCORD_WEBHOOK_URL -c workers/email/wrangler.jsonc
 */

import PostalMime from "postal-mime";

const MAX_TITLE = 256;
const MAX_DESCRIPTION = 4000;
const MAX_FIELD_VALUE = 1024;

function truncate(s, max) {
	if (!s) return "";
	s = String(s);
	return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function stripHtml(html) {
	return html
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export default {
	async email(message, env, ctx) {
		const webhook = env.DISCORD_WEBHOOK_URL;
		if (!webhook) {
			console.error("DISCORD_WEBHOOK_URL secret is not set");
			return;
		}

		// Parse the MIME message so we can read the body and sender display name.
		let parsed = {};
		try {
			const raw = await new Response(message.raw).arrayBuffer();
			parsed = await new PostalMime().parse(raw);
		} catch (err) {
			console.error("Failed to parse email:", err);
		}

		const subject =
			parsed.subject ||
			message.headers.get("subject") ||
			"(no subject)";

		const fromAddress = parsed.from?.address || message.from;
		const fromName = parsed.from?.name;
		const fromDisplay = fromName
			? `${fromName} <${fromAddress}>`
			: fromAddress;

		let body = parsed.text || "";
		if (!body && parsed.html) body = stripHtml(parsed.html);
		if (!body) body = "(empty message)";

		const payload = {
			username: "MoQ Alliance mail",
			embeds: [
				{
					title: truncate(subject, MAX_TITLE),
					description: truncate(body, MAX_DESCRIPTION),
					fields: [
						{
							name: "From",
							value: truncate(fromDisplay, MAX_FIELD_VALUE),
							inline: true,
						},
						{
							name: "To",
							value: truncate(message.to, MAX_FIELD_VALUE),
							inline: true,
						},
					],
					color: 0x5865f2,
					timestamp: new Date().toISOString(),
				},
			],
		};

		const resp = await fetch(webhook, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!resp.ok) {
			const text = await resp.text().catch(() => "");
			console.error(
				`Discord webhook failed: ${resp.status} ${resp.statusText} ${text}`,
			);
		}
	},
};
