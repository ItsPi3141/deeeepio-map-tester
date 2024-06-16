import { Assets, Container, DisplayObject, Sprite, Texture } from "pixi.js";
import { Body, Box, Circle, Vec2, World } from "planck";
import foods from "../game-utils/consts/foods.json";
import { planckDownscaleFactor } from "./constants";
import robustPointInPolygon from "robust-point-in-polygon";

const foodScale = 0.32;

export type FoodData = {
	type: "ground" | "water";
	id: number;
	respawnDelay: number;
	onlyOnWater: boolean;
	spawner: {
		ground?: { x: number; y: number }[];
		water?: {
			x: number;
			y: number;
			width: number;
			height: number;
		};
	} | null;
};

export class Food {
	data: FoodData;
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

	constructor(
		world: World,
		foodId: number,
		pixiFoodLayer: Container,
		x: number,
		y: number,
		data: FoodData,
		terrains: DisplayObject[],
		waters: DisplayObject[]
	) {
		this.foodData = foods.find((f) => f.id === foodId) || foods[13];

		this.data = data;

		// determine spawn location
		// TODO: implement ground food
		let spawnX = x;
		let spawnY = y;
		if (data?.type === "water" && data?.spawner?.water) {
			let validLocation = false;
			while (!validLocation) {
				spawnX = data.spawner.water.x + Math.random() * data.spawner.water.width;
				spawnY = data.spawner.water.y + Math.random() * data.spawner.water.height;

				let interrupt = false;
				for (let i = 0; i < terrains.length; i++) {
					const t = terrains[i] as DisplayObject & { points?: [number, number][] };
					// 1 is outside, 0 is on the line, -1 is inside
					if (t.points && [-1, 0].includes(robustPointInPolygon(t.points, [spawnX, spawnY]))) {
						interrupt = true;
						break;
					}
				}
				if (interrupt) {
					continue;
				}

				if (data.onlyOnWater) {
					for (let i = 0; i < waters.length; i++) {
						const w = waters[i] as DisplayObject & { points?: [number, number][] };
						// 1 is outside, 0 is on the line, -1 is inside
						if (w.points && [-1, 0].includes(robustPointInPolygon(w.points, [spawnX, spawnY]))) {
							validLocation = true;
							break;
						}
					}
				} else {
					validLocation = true;
				}
			}
		}
		this.food = world.createBody({
			type: "static", // TODO: add exception for coconut, volcanofood, and meat
			position: Vec2(spawnX / planckDownscaleFactor, spawnY / planckDownscaleFactor),
			awake: true,
			gravityScale: 0,
			bullet: true,
		});

		this.food.createFixture(
			Box((this.foodData.width / planckDownscaleFactor / 2) * foodScale, (this.foodData.height / planckDownscaleFactor / 2) * foodScale),
			{
				isSensor: true,
			}
		);

		// create instance in PIXI
		this.pixiFood = new Sprite(Assets.get(this.foodData.asset));
		this.pixiFood.anchor.set(0.5);
		this.pixiFood.width = this.foodData.width;
		this.pixiFood.height = this.foodData.height;
		this.pixiFood.setTransform(
			this.food.getPosition().x * planckDownscaleFactor,
			this.food.getPosition().y * planckDownscaleFactor,
			this.foodData.width * foodScale,
			this.foodData.width * foodScale,
			0
		);

		pixiFoodLayer.addChild(this.pixiFood);
	}

	get getState() {
		return this;
	}
}
