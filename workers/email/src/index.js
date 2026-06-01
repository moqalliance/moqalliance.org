/**
 * Email Worker for hello@moqalliance.org.
 *
 * Fans out incoming mail to every address in FORWARD_TO. Each forward is
 * awaited independently via Promise.allSettled so that a single unverified or
 * temporarily broken destination doesn't prevent the others from receiving
 * the message (and, importantly, doesn't trigger a Cloudflare retry that
 * would re-deliver duplicates to the addresses that already succeeded).
 *
 * Each destination address must first be verified in the Cloudflare Email
 * Routing dashboard before forwards to it will succeed.
 */

const FORWARD_TO = [
	"renandincer@gmail.com",
	"kixelated@gmail.com",
	"mike.english@gmail.com",
	"b5@n0.computer",
];

export default {
	async email(message, env, ctx) {
		const results = await Promise.allSettled(
			FORWARD_TO.map((to) => message.forward(to)),
		);

		const failures = results
			.map((r, i) => ({ r, to: FORWARD_TO[i] }))
			.filter(({ r }) => r.status === "rejected");

		for (const { to, r } of failures) {
			console.error(`forward to ${to} failed:`, r.reason);
		}

		// Don't throw — letting the worker succeed prevents Cloudflare from
		// retrying and double-delivering to the addresses that already worked.
	},
};
