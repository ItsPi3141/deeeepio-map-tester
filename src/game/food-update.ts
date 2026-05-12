import type { Food } from "../objects/food";
import { gameState } from "./game-state";

interface FoodUserData {
	increaseXp?: (xp: number) => void;
	[key: string]: unknown;
}

type FoodConstructor = new (
	world: NonNullable<typeof gameState.world>,
	foodId: number,
	pixiFoodLayer: NonNullable<typeof gameState.layers>["foodLayer"],
	x: number,
	y: number,
	foodData: Food["data"],
	terrains: NonNullable<typeof gameState.layers>["terrainsLayer"]["children"],
	waters: NonNullable<typeof gameState.layers>["waterLayer"]["children"],
) => Food;

export function updateFood(food: Food): Food | null {
	const s = gameState;
	const thisFood = food.getState;

	for (let ce = thisFood.food.getContactList(); ce; ce = ce.next) {
		const data = ce.other?.getUserData() as FoodUserData | undefined;

		if (data && typeof data.increaseXp !== "undefined") {
			setTimeout(() => {
				s.foods.push(
					new (food.constructor as FoodConstructor)(
						s.world!,
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
