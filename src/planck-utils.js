import { Edge, Vec2 } from "planck";
import { isClockwise } from "./game-utils/maploader";

export function addBoundaries(world, width, height) {
	const bottom = world.createBody();
	bottom.createFixture({
		shape: Edge(Vec2(0, height), Vec2(width, height)),
		restitution: 0.1,
	});
	const top = world.createBody();
	top.createFixture({
		shape: Edge(Vec2(0, 0), Vec2(width, 0)),
		restitution: 0.1,
	});
	const left = world.createBody();
	left.createFixture({
		shape: Edge(Vec2(0, 0), Vec2(0, height)),
		restitution: 0.1,
	});
	const right = world.createBody();
	right.createFixture({
		shape: Edge(Vec2(width, 0), Vec2(width, height)),
		restitution: 0.1,
	});
}

export function createTerrainCollider(world, terrain, pdf) {
	if (!isClockwise(terrain.points)) {
		terrain.points.reverse();
	}
	terrain.points.forEach((p, i) => {
		var v0 = Vec2(p.x / pdf, p.y / pdf);
		const pOld = terrain.points[(i + 1) % terrain.points.length];
		var v1 = Vec2(pOld.x / pdf, pOld.y / pdf);

		var pGhostOld =
			terrain.points[
				(terrain.points.length + i - 1) % terrain.points.length
			];
		var vprev = Vec2(pGhostOld.x / pdf, pGhostOld.y / pdf);
		var pGhostNew = terrain.points[(i + 2) % terrain.points.length];
		var vnext = Vec2(pGhostNew.x / pdf, pGhostNew.y / pdf);

		const edge = world.createBody({
			userData: {
				type: "terrain",
				vertices: [
					{ x: p.x / pdf, y: p.y / pdf },
					{ x: pOld.x / pdf, y: pOld.y / pdf },
				],
				id: terrain.id,
			},
		});
		edge.createFixture({
			shape: Edge(v0, v1).setPrevVertex(vprev).setNextVertex(vnext),
			friction: 1,
			restitution: 0,
		});
	});
}

function isTopEdge(current, last) {
	return current.x > last.x && current.x - last.x > 10;
}
