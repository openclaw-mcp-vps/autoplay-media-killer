import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

export function setupLemonSqueezyClient(apiKey: string) {
  lemonSqueezySetup({
    apiKey,
    onError: (error) => {
      console.error("Lemon Squeezy client error", error);
    },
  });
}
