import { Assets } from "pixi.js";

const spritesheets = [1, 2, 3, 4, 5, 6, 10];
export function loadAssets() {
	return new Promise(async (resolve) => {
		console.log("loading assets");
		await Assets.load([
			"/textures/beach_underwater.png",
			"/textures/beach.png",
			"/textures/cenote1.png",
			"/textures/chalk.png",
			"/textures/clay.png",
			"/textures/coldterrain_back.png",
			"/textures/coldterrain.png",
			"/textures/deepterrain.png",
			"/textures/estuarysand.png",
			"/textures/glacier.png",
			"/textures/limestone.png",
			"/textures/reef.png",
			"/textures/reef2.png",
			"/textures/rustymetal.png",
			"/textures/shallowglacier.png",
			"/textures/swamp_island.png",
			"/textures/terrain_back.png",
			"/textures/terrain.png",
			"/textures/volcanicsand.png",
			...spritesheets.map((e) => `/packs/${e}/spritesheets/1.json`)
		]);
		resolve();
	});
}
