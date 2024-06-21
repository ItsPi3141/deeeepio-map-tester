import throttle from "lodash.throttle";
import type { Animal } from "../objects/animal";

const throttleGrabHook = throttle(
	(animal: Animal) => {
		animal.grabHook.alpha = 0.5;
		setTimeout(() => {
			animal.grabHook.alpha = 0;
		}, 500);
	},
	850,
	{
		trailing: false,
	}
);

export function chargedBoost(animal: Animal, throttledBoost: () => void) {
	throttledBoost();
	throttleGrabHook(animal);
}
