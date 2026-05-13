import foods from "../game-utils/consts/foods.json";
import { gameState } from "../game/game-state";
import { planckDownscaleFactor } from "./constants";
import { Assets, Container, Sprite } from "pixi.js";
import { Body, Box, Vec2, World } from "planck";
import robustPointInPolygon from "robust-point-in-polygon";

const foodScale = 0.32;
const maxRetries = 1000;

export type FoodData = {
	type: "ground" | "water";
	id: number;
	respawnDelay: number;
	onlyOnWater: boolean;
	spawner: {
		ground?: { x: number; y: number }[];
		water?: { x: number; y: number; width: number; height: number };
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
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		world: World,
		foodId: number,
		pixiFoodLayer: Container,
		x: number,
		y: number,
		data: FoodData,
	) {
		this.foodData = foods.find((f) => f.id === foodId) || foods[13];

		this.data = data;

		const s = gameState;

		// determine spawn location
		// TODO: implement ground food
		let spawnX = x;
		let spawnY = y;
		if (data?.type === "water" && data?.spawner?.water) {
			let validLocation = false;
			let remainingTries = maxRetries;
			const terrainPoints = [...s.terrainPolygons, ...s.islandPolygons].map((poly) =>
				poly.map((p) => [p.x, p.y] as [number, number]),
			);
			const waterPoints = s.waterObjects.map((poly) => poly.map((p) => [p.x, p.y] as [number, number]));
			const airPocketPoints = s.airPocketObjects.map((poly) => poly.map((p) => [p.x, p.y] as [number, number]));
			while (!validLocation && remainingTries > 0) {
				remainingTries--;
				spawnX = data.spawner.water.x + Math.random() * data.spawner.water.width;
				spawnY = data.spawner.water.y + Math.random() * data.spawner.water.height;

				let interrupt = false;
				for (let i = 0; i < terrainPoints.length; i++) {
					if ([-1, 0].includes(robustPointInPolygon(terrainPoints[i], [spawnX, spawnY]))) {
						interrupt = true;
						break;
					}
				}
				if (interrupt) {
					continue;
				}

				if (data.onlyOnWater) {
					for (let i = 0; i < waterPoints.length; i++) {
						if ([-1, 0].includes(robustPointInPolygon(waterPoints[i], [spawnX, spawnY]))) {
							validLocation = true;
							break;
						}
					}
					if (validLocation) {
						for (let i = 0; i < airPocketPoints.length; i++) {
							if ([-1, 0].includes(robustPointInPolygon(airPocketPoints[i], [spawnX, spawnY]))) {
								validLocation = false;
								break;
							}
						}
					}
				} else {
					validLocation = true;
				}
			}
		}
		this.food = world.createBody({
			type: "static", // TODO: add exception for coconut, volcanofood, and meat
			position: new Vec2(spawnX / planckDownscaleFactor, spawnY / planckDownscaleFactor),
			awake: true,
			gravityScale: 0,
			bullet: true,
		});

		this.food.createFixture(
			new Box(
				(this.foodData.width / planckDownscaleFactor / 2) * foodScale,
				(this.foodData.height / planckDownscaleFactor / 2) * foodScale,
			),
			{ isSensor: true },
		);

		// create instance in PIXI
		this.pixiFood = new Sprite(Assets.get(this.foodData.asset));
		this.pixiFood.anchor.set(0.5);
		this.pixiFood.width = this.foodData.width;
		this.pixiFood.height = this.foodData.height;
		this.pixiFood.position.set(
			this.food.getPosition().x * planckDownscaleFactor,
			this.food.getPosition().y * planckDownscaleFactor,
		);
		this.pixiFood.scale.set(this.foodData.width * foodScale);

		pixiFoodLayer.addChild(this.pixiFood);
	}

	get getState() {
		return this;
	}
}
