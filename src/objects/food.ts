import { Assets, Container, Sprite, Texture } from "pixi.js";
import { Body, Circle, Vec2, World } from "planck";
import foods from "../game-utils/consts/foods.json";
import { planckDownscaleFactor } from "./constants";

const foodScale = 0.3;

export class Food {
	food: Body;
	foodData: {
		id: number;
		pack_id: number;
		name: string;
		xp: number;
		asset: string;
		width: number;
		height: number;
		body_type: number;
		grabbable: boolean;
		collides_terrain: boolean;
		flow_affected: boolean;
		exclusion_mode: string;
		fish_level: number | null;
		excluding: string | null;
		including: string | null;
		created_at: string;
		updated_at: string;
	};
	pixiFood: Sprite;

	constructor(world: World, foodId: number, pixiFoodLayer: Container, x: number, y: number) {
		this.foodData = foods.find((f) => f.id === foodId) || foods[13];

		this.food = world.createBody({
			type: "static", // TODO: add exception for coconut, volcanofood, and meat
			position: Vec2(x, y),
			awake: true,
			gravityScale: 0,
			bullet: true,
		});
		this.food.createFixture(Circle((this.foodData.width / planckDownscaleFactor / 2) * foodScale), {
			isSensor: true,
		});

		// create instance in PIXI
		this.pixiFood = new Sprite(Assets.get(this.foodData.asset));
		this.pixiFood.anchor.set(0.5);
		this.pixiFood.setTransform(
			this.food.getPosition().x * planckDownscaleFactor,
			this.food.getPosition().y * planckDownscaleFactor,
			this.foodData.width * foodScale,
			this.foodData.height * foodScale,
			0
		);

		pixiFoodLayer.addChild(this.pixiFood);
	}

	get getState() {
		return this;
	}
}
