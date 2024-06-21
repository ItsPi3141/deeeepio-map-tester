import { Assets } from "pixi.js";

const mapSpritesheets = [1, 2, 3, 4, 5, 6, 10];
const animalSpritesheets = ["assets", "assets-1", "assets-2", "assets-3", "assets-4"];
export function loadAssets() {
	return new Promise<void>((resolve) => {
		console.log("Loading assets...");
		(async () => {
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
				...mapSpritesheets.map((e) => `/packs/${e}/spritesheets/1.json`),
				...animalSpritesheets.map((e) => `/animals/spritesheets/${e}.json`),
			]);
			resolve();
		})();
	});
}
