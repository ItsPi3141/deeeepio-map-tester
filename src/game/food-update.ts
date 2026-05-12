import type { Food } from "../objects/food";
import { gameState } from "./game-state";

export function updateFood(food: Food): Food | null {
	const s = gameState;
	const thisFood = food.getState;

	for (let ce = thisFood.food.getContactList(); ce; ce = ce.next) {
		const data = ce.other?.getUserData() as Record<string, any>;

		if (typeof data.increaseXp !== "undefined") {
			setTimeout(() => {
				s.foods.push(
					new (food.constructor as any)(
						s.world,
						food.data.id,
						s.layers!.foodLayer,
						0,
						0,
						food.data,
						[...s.layers!.terrainsLayer.children, ...s.layers!.islandsLayer.children],
						s.layers!.waterLayer.children,
					),
				);
			}, food.data.respawnDelay || 1000);
			data.increaseXp(thisFood.foodData.xp);
			s.world!.destroyBody(thisFood.food);
			thisFood.pixiFood.destroy();
			return null;
		}
	}

	return food;
}
