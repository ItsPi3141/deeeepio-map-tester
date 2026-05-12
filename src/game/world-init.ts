import { planckDownscaleFactor } from "../objects/constants";
import { addBoundaries, createTerrainCollider } from "../planck-utils";
import type { DeeeepioMapScreenObject } from "../types";
import type { MapData } from "./game-state";
import { Vec2, World } from "planck";

// eslint-disable-next-line @typescript-eslint/no-deprecated
export function initWorld(map: MapData): World {
	const world = new World({ gravity: new Vec2(0, map.settings.gravity * 3) });

	addBoundaries(
		world,
		(Number(map.worldSize.width) * 10) / planckDownscaleFactor,
		(Number(map.worldSize.height) * 10) / planckDownscaleFactor,
	);

	map.screenObjects.terrains?.forEach((terrain: DeeeepioMapScreenObject) => {
		createTerrainCollider(world, terrain, planckDownscaleFactor);
	});
	map.screenObjects.islands?.forEach((island: DeeeepioMapScreenObject) => {
		createTerrainCollider(world, island, planckDownscaleFactor);
	});

	return world;
}
