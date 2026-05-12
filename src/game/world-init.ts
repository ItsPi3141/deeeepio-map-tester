import * as planck from "planck";
import { addBoundaries, createTerrainCollider } from "../planck-utils";
import { planckDownscaleFactor } from "../objects/constants";
import type { DeeeepioMapScreenObject } from "../types";
import type { MapData } from "./game-state";

export function initWorld(map: MapData): planck.World {
	const world = new planck.World({
		gravity: new planck.Vec2(0, map.settings.gravity * 3),
	});

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
