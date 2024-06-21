import type { Animal } from "../objects/animal";

export function chargedBoost(animal: Animal, throttledBoost: () => void) {
	throttledBoost();
}
