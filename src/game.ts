import * as PIXI from "pixi.js";
import { clampCamera, createRadialGradient, renderGradientShape, renderTerrainShape, renderWaterBorder } from "./pixi-utils";

import * as planck from "planck";
import { addBoundaries, createTerrainCollider } from "./planck-utils";

import throttle from "lodash.throttle";
import * as TWEEN from "@tweenjs/tween.js";

import { clamp, findNearestPointOnLine, point2rad, rad2deg } from "./math-utils";

import pointInPolygon from "robust-point-in-polygon";

import { loadAssets } from "./assetsloader";

import { getBiomes, getHidespaceById, getPropById, getShadowSize, loadMap } from "./game-utils/maploader";
import { boostPower, linearDampingFactor, planckDownscaleFactor } from "./objects/constants";
import { Animal } from "./objects/animal";
import { Food } from "./objects/food";
import type { DeeeepioMapScreenObject } from "./types";

const map = loadMap(window.mapData);
console.log(map);

await loadAssets();

const world = new planck.World({
	gravity: planck.Vec2(0, map.settings.gravity * 3),
});

addBoundaries(world, (map.worldSize.width * 10) / planckDownscaleFactor, (map.worldSize.height * 10) / planckDownscaleFactor);

map.screenObjects.terrains?.forEach((terrain: DeeeepioMapScreenObject) => {
	createTerrainCollider(world, terrain, planckDownscaleFactor);
});
map.screenObjects.islands?.forEach((island: DeeeepioMapScreenObject) => {
	createTerrainCollider(world, island, planckDownscaleFactor);
});

let zoom = 8;

// Create game canvas
const app = new PIXI.Application({
	backgroundColor: 0x1f2937,
	backgroundAlpha: 0,
	resizeTo: document.querySelector("main > div.game") as HTMLDivElement,
	resolution: window.devicePixelRatio,
	antialias: true,
	clearBeforeRender: true,
});
(document.querySelector("main > div.game") as HTMLDivElement).appendChild(app.view as HTMLCanvasElement);

// Layer order from top to bottom:
// *food
// *shadow
// ceilings
// terrains
// *top water border
// islands
// hide-spaces (above animals)
// animals
// currents
// props
// hide-spaces (below animals)
// hide-spaces (lowest, <=60% opacity)
// platforms
// *bottom water border
// air-pockets
// background-terrains
// water
// sky
// When adding layers in PIXI, lowest layer is added first
const skyLayer = new PIXI.Container();
app.stage.addChild(skyLayer);

const waterLayer = new PIXI.Container();
app.stage.addChild(waterLayer);

const backgroundTerrainsLayer = new PIXI.Container();
app.stage.addChild(backgroundTerrainsLayer);

const airPocketsLayer = new PIXI.Container();
app.stage.addChild(airPocketsLayer);

const waterBorderLowLayer = new PIXI.Container();
app.stage.addChild(waterBorderLowLayer);

const hideSpacesLowerLayer = new PIXI.Container();
app.stage.addChild(hideSpacesLowerLayer);

const hideSpacesLowLayer = new PIXI.Container();
app.stage.addChild(hideSpacesLowLayer);

const propsLayer = new PIXI.Container();
app.stage.addChild(propsLayer);

const platformsLayer = new PIXI.Container();
app.stage.addChild(platformsLayer);

const currentsLayer = new PIXI.Container();
app.stage.addChild(currentsLayer);

const animalsLayer = new PIXI.Container();
app.stage.addChild(animalsLayer);

const animalsUiLayer = new PIXI.Container();
app.stage.addChild(animalsUiLayer);

const hideSpacesHighLayer = new PIXI.Container();
app.stage.addChild(hideSpacesHighLayer);

const islandsLayer = new PIXI.Container();
app.stage.addChild(islandsLayer);

const waterBorderHighLayer = new PIXI.Container();
app.stage.addChild(waterBorderHighLayer);

const terrainsLayer = new PIXI.Container();
app.stage.addChild(terrainsLayer);

const ceilingsLayer = new PIXI.Container();
app.stage.addChild(ceilingsLayer);

const shadowLayer = new PIXI.Container();
app.stage.addChild(shadowLayer);

const foodLayer = new PIXI.Container();
app.stage.addChild(foodLayer);

app.ticker.add((dt) => {
	update(dt);
});

const waterObjects: {
	x: number;
	y: number;
}[][] = [];
const airPocketObjects: {
	x: number;
	y: number;
}[][] = [];
// one-time rendering
// Render map
map.screenObjects.sky?.forEach((sky: DeeeepioMapScreenObject) => {
	const shape = renderGradientShape(sky.points, sky.colors[0], sky.colors[1]);
	skyLayer.addChild(shape);
});
map.screenObjects.water?.forEach((water: DeeeepioMapScreenObject) => {
	const shape = renderGradientShape(water.points, water.colors[0], water.colors[1]);
	waterLayer.addChild(shape);
	waterObjects.push(water.points);

	if (water.hasBorder) {
		const border = renderWaterBorder(water.points, water.colors[0], false);
		border.topBorder?.forEach((b) => {
			waterBorderLowLayer.addChild(b);
		});
		border.bottomBorder?.forEach((b) => {
			waterBorderHighLayer.addChild(b);
		});
	}
});
map.screenObjects["air-pockets"]?.forEach((airpocket: DeeeepioMapScreenObject) => {
	const shape = renderTerrainShape(airpocket.points, airpocket.texture, true);
	shape.tint = 0xaaaaaa; // Hex color code #AAAAAA
	airPocketsLayer.addChild(shape);
	airPocketObjects.push(airpocket.points);

	const border = renderWaterBorder(airpocket.points, airpocket.borderColor, true);
	border.topBorder?.forEach((b) => {
		waterBorderLowLayer.addChild(b);
	});
	border.bottomBorder?.forEach((b) => {
		waterBorderHighLayer.addChild(b);
	});
});
map.screenObjects["background-terrains"]?.forEach((bgterrain: DeeeepioMapScreenObject) => {
	const shape = renderTerrainShape(bgterrain.points, bgterrain.texture, true);
	shape.alpha = bgterrain.opacity;
	backgroundTerrainsLayer.addChild(shape);
});
map.screenObjects.platforms?.forEach((platform: DeeeepioMapScreenObject) => {
	const shape = renderTerrainShape(platform.points, platform.texture, false);
	platformsLayer.addChild(shape);
});
map.screenObjects.islands?.forEach((island: DeeeepioMapScreenObject) => {
	const shape = renderTerrainShape(island.points, island.texture, false);
	islandsLayer.addChild(shape);
});
map.screenObjects.terrains?.forEach((terrain: DeeeepioMapScreenObject) => {
	const shape = renderTerrainShape(terrain.points, terrain.texture, false);
	terrainsLayer.addChild(shape);
});
map.screenObjects.ceilings?.forEach((ceiling: DeeeepioMapScreenObject) => {
	const shape: PIXI.Graphics & { points?: number[][] } = renderTerrainShape(ceiling.points, ceiling.texture, false);
	shape.points = ceiling.points.map((p) => [p.x, p.y]);
	ceilingsLayer.addChild(shape);
});
map.screenObjects["hide-spaces"]?.forEach((hidespace: DeeeepioMapScreenObject) => {
	const hs = getHidespaceById(hidespace.hSType);
	if (!hs) return;
	const object: PIXI.Sprite & { animation?: string } = new PIXI.Sprite(PIXI.Assets.get(hs.asset));
	object.width = hs.width * 10;
	object.height = hs.height * 10;
	object.anchor.set(hs.anchor_x, hs.anchor_y);
	object.position.set(hidespace.x, hidespace.y);
	object.alpha = hidespace.opacity || 1;
	object.angle = hidespace.rotation;
	object.zIndex = hidespace.id;
	if (hidespace.hSType === 21) {
		object.animation = "whirlpool";
		object.alpha /= 2;
	}

	if (hs.above && (hidespace.opacity === 1 || hidespace.opacity === undefined)) {
		hideSpacesHighLayer.addChild(object);
	} else if (hidespace.opacity !== 1) {
		hideSpacesLowerLayer.addChild(object);
	} else {
		hideSpacesLowLayer.addChild(object);
	}
});
map.screenObjects.props?.forEach((prop: DeeeepioMapScreenObject) => {
	const p = getPropById(prop.pType);
	if (!p) return;
	const object = new PIXI.Sprite(PIXI.Assets.get(p.asset));
	object.width = p.width * 10;
	object.height = p.height * 10;
	object.anchor.set(p.anchor_x, p.anchor_y);
	object.position.set(prop.x, prop.y);
	object.angle = prop.rotation;

	// Message sign
	if (p.id === 1 && prop.params?.text) {
		const text = new PIXI.Text(prop.params.text, {
			fontFamily: "Quicksand",
			fontSize: 24,
			fill: 0x7f694e,
			align: "center",
			wordWrapWidth: 300,
			trim: true,
			wordWrap: true,
			breakWords: true,
			fontWeight: "bolder",
		});
		text.anchor.set(0.5);
		text.localTransform.setTransform(0, -350, 0, 0, 1, 1, 0, 0, 0);
		object.addChild(text);
	}

	propsLayer.addChild(object);
});

const shadowSettings = {
	alpha: 0,
	size: 0,
};
function setShadowSize(size: number) {
	shadowLayer.removeChildren();
	if (size === 0) return;

	const leftRightHeight = window.innerHeight;
	const leftRightWidth = (window.innerWidth - size / zoom) / 2;

	const topBottomHeight = (window.innerHeight - size / zoom) / 2;
	const topBottomWidth = window.innerWidth - leftRightWidth * 2;
	const shadow = new PIXI.Graphics();
	shadow.transform.position.set(-window.innerWidth / 2, -window.innerHeight / 2);
	shadow.beginFill(0x000000);
	shadow.drawRect(0, 0, leftRightWidth, leftRightHeight);
	shadow.drawRect(window.innerWidth - leftRightWidth, 0, leftRightWidth, leftRightHeight);
	shadow.drawRect(leftRightWidth, 0, topBottomWidth, topBottomHeight);
	shadow.drawRect(leftRightWidth, window.innerHeight - topBottomHeight, topBottomWidth, topBottomHeight);

	shadow.beginTextureFill({
		texture: createRadialGradient(size / zoom, "#00000000", "#000000ff"),
		matrix: new PIXI.Matrix(1, 0, 0, 1, leftRightWidth, topBottomHeight),
	});
	shadow.drawRect(leftRightWidth, topBottomHeight, size / zoom, size / zoom);

	shadowLayer.addChild(shadow);
}
shadowLayer.alpha = 0;
setShadowSize(getShadowSize(0));

// Get habitats
const habitats = map.screenObjects.habitats?.map((h: DeeeepioMapScreenObject) => ({
	...h,
	points: h.points.map((p) => [p.x, p.y]),
}));

// Whirlpool animation
const whirlPool = { rotation: 0 };
const whirlPoolTween = new TWEEN.Tween(whirlPool, false)
	.to({ rotation: 360 }, 5000)
	.easing(TWEEN.Easing.Sinusoidal.InOut)
	.repeat(Number.POSITIVE_INFINITY)
	.start();
(() => {
	const animate = (time: number) => {
		whirlPoolTween.update(time);
		requestAnimationFrame(animate);
	};
	requestAnimationFrame(animate);
})();

// Render player.pixi
const myAnimals: Animal[] = [];
myAnimals.push(new Animal(world, 0, animalsLayer, animalsUiLayer, 1, 1, window.playerName));
// for (var i = 0; i < 100; i++) {
// 	setTimeout(() => {
// 		var animal = new Animal(world, 11, animalsLayer, animalsUiLayer, 1, 1, window.playerName);
// 		myAnimals.push(animal);
// 		setupBoost(animal);
// 	}, 500 * i);
// }

// Render foods
const foods: Food[] = [];
map.screenObjects["food-spawns"]?.forEach((f: DeeeepioMapScreenObject) => {
	for (let i = 0; i < f.settings.count; i++) {
		const x = f.position.x + Math.random() * f.size.width;
		const y = f.position.y + Math.random() * f.size.height;
		const foodId = f.settings.foodIds[Math.floor(Math.random() * f.settings.foodIds.length)];
		foods.push(new Food(world, foodId, foodLayer, x / planckDownscaleFactor, y / planckDownscaleFactor));
	}
});
// foods.push(new Food(world, 3, foodLayer, 35, 35));

const mouseData = {
	clientX: 0,
	clientY: 0,
};

function update(dt: number) {
	app.stage.position.set(window.innerWidth / 2, window.innerHeight / 2);
	app.stage.scale.set(zoom);

	hideSpacesLowLayer.children.forEach((object: PIXI.DisplayObject & { animation?: string }) => {
		if (object.animation !== "whirlpool") return;
		object.angle = whirlPool.rotation;
	});
	hideSpacesLowerLayer.children.forEach((object: PIXI.DisplayObject & { animation?: string }) => {
		if (object.animation !== "whirlpool") return;
		object.angle = whirlPool.rotation;
	});

	myAnimals.forEach((animal, index) => {
		updateAnimal(animal, true, index === 0);
	});

	foods.forEach((food) => {
		updateFood(food);
	});

	world.step((app.ticker.elapsedMS / 1000) * dt, 8, 5);
	world.clearForces();
}

function updateAnimal(animal: Animal, isMine: boolean, isMain = false) {
	const thisAnimal = animal.getState;
	thisAnimal.inWater =
		waterObjects.reduce(
			(prev, cur) =>
				prev ||
				[-1, 0].includes(
					pointInPolygon(
						cur.map((p) => [p.x, p.y]),
						[thisAnimal.pixiAnimal.x, thisAnimal.pixiAnimal.y - (thisAnimal.prevInWater ? 0 : 2)]
					)
				),
			false
		) &&
		!airPocketObjects.reduce(
			(prev, cur) =>
				prev ||
				pointInPolygon(
					cur.map((p) => [p.x, p.y]),
					[thisAnimal.pixiAnimal.x, thisAnimal.pixiAnimal.y - (thisAnimal.prevInWater ? 0 : 2)]
				) === -1,
			false
		);
	thisAnimal.prevInWater = thisAnimal.inWater;

	thisAnimal.doApplyForce =
		Math.sqrt(
			((thisAnimal.pixiAnimal.x - app.stage.pivot.x) * zoom - (mouseData.clientX - window.innerWidth / 2)) ** 2 +
				((thisAnimal.pixiAnimal.y - app.stage.pivot.y) * zoom - (mouseData.clientY - window.innerHeight / 2)) ** 2
		) >
		6 * zoom;

	if (!thisAnimal.inWater) {
		if (!thisAnimal.walking) {
			thisAnimal.doApplyForce = false;
			thisAnimal.animal.setLinearDamping(0.1);
			thisAnimal.animal.setGravityScale(1);
		} else {
			thisAnimal.animal.setLinearDamping(linearDampingFactor);
			thisAnimal.animal.setGravityScale(0);
		}
	} else {
		thisAnimal.animal.setGravityScale(0);
		thisAnimal.animal.setLinearDamping(linearDampingFactor);
	}

	const spdf =
		thisAnimal.speedFac *
		(thisAnimal.doApplyForce ? 1 : 0) *
		(thisAnimal.walking ? thisAnimal.animalData.walkSpeedMultiplier : thisAnimal.animalData.speedMultiplier);

	if (thisAnimal.doApplyForce !== thisAnimal.oldDoApplyForce && thisAnimal.oldDoApplyForce === true && thisAnimal.inWater) {
		setTimeout(() => {
			thisAnimal.animal.setLinearDamping(linearDampingFactor);
		}, 100);
		thisAnimal.animal.setLinearDamping(linearDampingFactor * 2);
	}

	const rotation = thisAnimal.direction - Math.PI / 2;

	thisAnimal.animal.setAngle(thisAnimal.direction);
	thisAnimal.animal.applyForce(planck.Vec2(Math.cos(rotation) * spdf, Math.sin(rotation) * spdf), thisAnimal.animal.getPosition());

	thisAnimal.pixiAnimal.setTransform(
		thisAnimal.animal.getPosition().x * planckDownscaleFactor,
		thisAnimal.animal.getPosition().y * planckDownscaleFactor,
		thisAnimal.animalSize.pixi.scale,
		thisAnimal.animalSize.pixi.scale,
		thisAnimal.pixiAnimal.rotation
	);
	thisAnimal.pixiAnimalUi.setTransform(
		thisAnimal.animal.getPosition().x * planckDownscaleFactor,
		thisAnimal.animal.getPosition().y * planckDownscaleFactor - 7,
		0.1,
		0.1,
		0
	);

	if (thisAnimal.animalData.canStand) {
		let contacts = [];
		let distToGround = Number.POSITIVE_INFINITY;
		for (let ce = thisAnimal.animal.getContactList(); ce; ce = ce.next) {
			const c = ce.contact;
			contacts.push(c.getFixtureA().getBody());
		}
		contacts = contacts
			.filter((d: planck.Body) => (d.getUserData() as { type?: string })?.type === "terrain")
			.filter((d: planck.Body) => {
				const v = (d.getUserData() as { vertices?: { x: number; y: number }[] })?.vertices;
				const p = thisAnimal.animal.getPosition();
				if (!v || !p) return false;
				const nearestPoint = findNearestPointOnLine(p.x, p.y, v[0].x, v[0].y, v[1].x, v[1].y);
				return nearestPoint.y - p.y > 0 && Math.abs((v[0].y - v[1].y) / (v[0].x - v[1].x)) < 3;
			});
		const nearestContact = contacts.reduce((prev: (planck.Body & { dist?: number }) | null, cur: planck.Body): (planck.Body & { dist?: number }) | null => {
			const v = (cur.getUserData() as { vertices?: { x: number; y: number }[] })?.vertices;
			const p = thisAnimal.animal.getPosition();
			if (!v || !p) return prev;
			const n = findNearestPointOnLine(p.x, p.y, v[0].x, v[0].y, v[1].x, v[1].y);
			const dist = Math.sqrt((n.x - p.x) ** 2 + (n.y - p.y) ** 2);

			if (prev != null && dist >= (prev.dist || Number.POSITIVE_INFINITY)) return prev;

			distToGround = dist;
			const c: planck.Body & { dist?: number } = cur;
			c.dist = dist;
			return c;
		}, null);
		if (
			nearestContact != null &&
			distToGround < 1.1 * thisAnimal.animalData.sizeScale.y &&
			(thisAnimal.animalData.canWalkUnderwater || thisAnimal.inWater)
		) {
			const data = nearestContact.getUserData();
			const v = (data as { vertices?: { x: number; y: number }[] })?.vertices;
			if (v) {
				const rise = v[0].y - v[1].y;
				const run = v[0].x - v[1].x;
				const angle = Math.atan2(rise, run);
				thisAnimal.pixiAnimal.rotation = angle + Math.PI;
				thisAnimal.animal.setAngle(angle + Math.PI / 2);
				thisAnimal.walking = true;

				// Walking using apply force
				// thisAnimal.animal.applyForce(planck.Vec2(Math.cos(angle - Math.PI / 2) * 10, Math.sin(angle - Math.PI / 2) * 10), thisAnimal.animal.getPosition());

				// Walking using distance joint
				thisAnimal.groundJoints.forEach((j) => {
					world.destroyJoint(j);
				});
				thisAnimal.groundJoints = [];
				const p = thisAnimal.animal.getPosition();
				// Make the animal closer to the ground before creating a joint
				// TODO: actually use math to do this instead of applying a force
				// thisAnimal.animal.applyForce(
				// 	planck.Vec2(
				// 		Math.cos(angle - Math.PI / 2) * 10,
				// 		Math.sin(angle - Math.PI / 2) * 10
				// 	),
				// 	thisAnimal.animal.getPosition()
				// );
				contacts.forEach((c) => {
					const s = thisAnimal.animalSize.planck.height / 5;
					const animalX = thisAnimal.animal.getWorldCenter().x + planck.Vec2(Math.cos(angle - Math.PI / 2) * s, Math.sin(angle - Math.PI / 2) * s).x;
					const animalY = thisAnimal.animal.getWorldCenter().y + planck.Vec2(Math.cos(angle - Math.PI / 2) * s, Math.sin(angle - Math.PI / 2) * s).y;
					const joint = world.createJoint(
						new planck.DistanceJoint(
							{
								frequencyHz: 8,
								dampingRatio: 0.9,
								collideConnected: true,
							},
							c,
							thisAnimal.animal,
							findNearestPointOnLine(p.x, p.y, v[0].x, v[0].y, v[1].x, v[1].y),
							planck.Vec2(animalX, animalY)
						)
					);
					joint?.setLength(thisAnimal.animalSize.planck.height / 4 - s);
					if (joint) thisAnimal.groundJoints.push(joint);
				});

				// Walking using prismatic joint
				// if (thisAnimal.groundAnchorId != data.id) {
				// 	thisAnimal.groundAnchorId = data.id;

				// 	thisAnimal.groundJoints.forEach((j) => {
				// 		world.destroyJoint(j);
				// 	});
				// 	thisAnimal.groundJoints = [];

				// 	var joint = world.createJoint(
				// 		new planck.PrismaticJoint(
				// 			{
				// 				collideConnected: true
				// 			},
				// 			contacts,
				// 			thisAnimal.animal,
				// 			thisAnimal.animal.getWorldCenter(),
				// 			new planck.Vec2(run, rise)
				// 		)
				// 	);
				// 	thisAnimal.groundJoints.push(joint);
				// }
			}
		} else {
			if (distToGround > 1.2) {
				thisAnimal.walking = false;
				// thisAnimal.groundAnchorId = null;
				thisAnimal.groundJoints.forEach((j) => {
					world.destroyJoint(j);
				});
				thisAnimal.groundJoints = [];
			}
		}
	}

	if (isMine) {
		const centerX = (thisAnimal.pixiAnimal.x - app.stage.pivot.x) * zoom;
		const centerY = (thisAnimal.pixiAnimal.y - app.stage.pivot.y) * zoom;
		thisAnimal.direction = point2rad(mouseData.clientX - window.innerWidth / 2, mouseData.clientY - window.innerHeight / 2, centerX, centerY) + Math.PI / 2;
		if (!thisAnimal.walking) {
			thisAnimal.pixiAnimal.rotation = thisAnimal.direction;
		}

		if (isMain) {
			const viewportPos = clampCamera(
				thisAnimal.pixiAnimal.x,
				thisAnimal.pixiAnimal.y,
				zoom,
				map.worldSize.width * 10,
				map.worldSize.height * 10,
				window.innerWidth,
				window.innerHeight
			);
			app.stage.pivot.set(...viewportPos);
			shadowLayer.pivot.set(-thisAnimal.pixiAnimal.x, -thisAnimal.pixiAnimal.y);

			ceilingsLayer.children.forEach((c: PIXI.DisplayObject & { points?: [number, number][] }) => {
				if (c.points && [-1, 0].includes(pointInPolygon(c.points, [thisAnimal.pixiAnimal.x, thisAnimal.pixiAnimal.y - (thisAnimal.inWater ? 0 : 2)]))) {
					c.alpha = 0.4;
				} else {
					c.alpha = 1;
				}
			});

			hideSpacesHighLayer.children.forEach((h) => {
				if ((thisAnimal.pixiAnimal.x - h.x) ** 2 + (thisAnimal.pixiAnimal.y - h.y) ** 2 < Math.max(window.innerHeight, window.innerWidth) * zoom * 20) {
					h.renderable = true;
				} else {
					h.renderable = false;
				}
			});
			hideSpacesLowLayer.children.forEach((h) => {
				if ((thisAnimal.pixiAnimal.x - h.x) ** 2 + (thisAnimal.pixiAnimal.y - h.y) ** 2 < Math.max(window.innerHeight, window.innerWidth) * zoom * 20) {
					h.renderable = true;
				} else {
					h.renderable = false;
				}
			});

			let currentBiomes = 0;
			habitats.forEach((h: DeeeepioMapScreenObject & { points: [number, number][] }) => {
				if (pointInPolygon(h.points, [thisAnimal.pixiAnimal.x, thisAnimal.pixiAnimal.y]) !== 1) {
					currentBiomes = currentBiomes | h.settings.area;
				}
			});
			const currentBiomesList = getBiomes(currentBiomes);
			if (currentBiomesList.includes("deep")) {
				if (currentBiomesList.includes("shallow")) {
					shadowSettings.alpha = 0.5;
				} else {
					shadowSettings.alpha = 1;
				}
			} else {
				shadowSettings.alpha = 0;
			}

			if (shadowSettings.alpha > shadowLayer.alpha) {
				shadowLayer.alpha = Math.round((shadowLayer.alpha + 0.02) * 100) / 100;
			} else if (shadowSettings.alpha < shadowLayer.alpha) {
				shadowLayer.alpha = Math.round((shadowLayer.alpha - 0.02) * 100) / 100;
			}
		}
	}
}

function updateFood(food: Food) {
	const thisFood = food.getState;

	// get a list of animals touching this food
	// TODO: filter animals that cannot eat this food out
	let contacts = [];
	for (let ce = thisFood.food.getContactList(); ce; ce = ce.next) {
		if (typeof (ce.other?.getUserData() as Record<string, any>).increaseXp !== "undefined") contacts.push(ce.other);
	}
	if (contacts.length > 0) {
		(contacts[0]?.getUserData() as Record<string, any>).increaseXp(thisFood.foodData.xp);
	}
}

document.addEventListener("mousemove", (event) => {
	mouseData.clientX = event.clientX;
	mouseData.clientY = event.clientY;
});

const setupBoost = (animal: Animal) => {
	const throttledBoost = throttle(
		(event, animalInstance) => {
			const centerX = (animalInstance.pixiAnimal.x - app.stage.pivot.x) * zoom;
			const centerY = (animalInstance.pixiAnimal.y - app.stage.pivot.y) * zoom;
			const angle = point2rad(event.clientX - window.innerWidth / 2, event.clientY - window.innerHeight / 2, centerX, centerY);

			animalInstance.animal.applyLinearImpulse(
				planck.Vec2(
					Math.cos(angle) * animalInstance.speedFac * (animalInstance.inWater ? boostPower.water : boostPower.air),
					Math.sin(angle) * animalInstance.speedFac * (animalInstance.inWater ? boostPower.water : boostPower.air)
				),
				animalInstance.animal.getPosition()
			);
			const sf = { v: 0 };
			const boostTween = new TWEEN.Tween(sf, false)
				.to({ v: animalInstance.speedFac }, 300)
				.easing(TWEEN.Easing.Quartic.In)
				.onUpdate(() => {
					animalInstance.speedFac = sf.v;
				})
				.start();
			function boost(time: number) {
				boostTween.update(time);
				requestAnimationFrame(boost);
			}
			requestAnimationFrame(boost);
		},
		850,
		{ trailing: false }
	);
	const throttledLandhop = throttle(
		(event, animalInstance) => {
			const centerX = (animalInstance.pixiAnimal.x - app.stage.pivot.x) * zoom;
			const centerY = (animalInstance.pixiAnimal.y - app.stage.pivot.y) * zoom;
			const angle = point2rad(event.clientX - window.innerWidth / 2, event.clientY - window.innerHeight / 2, centerX, centerY);

			animalInstance.animal.applyLinearImpulse(
				planck.Vec2(Math.cos(angle) * animalInstance.speedFac * boostPower.land, Math.sin(angle) * animalInstance.speedFac * boostPower.land),
				animalInstance.animal.getPosition()
			);
		},
		150,
		{ trailing: false }
	);

	app.view.addEventListener?.("click", (event: Event) => {
		const myAnimal = animal.getState;

		let landhop = false;

		if (!myAnimal.inWater) {
			const contact = [];
			for (let ce = myAnimal.animal.getContactList(); ce; ce = ce.next) {
				contact.push(ce);
			}
			try {
				if (contact.filter((c: planck.ContactEdge) => ((c.other as planck.Body).getUserData() as { type: string }).type === "terrainTop").length > 0) {
					landhop = true;
				}
			} catch {}
		}

		if (landhop) {
			throttledLandhop(event, myAnimal);
		} else {
			throttledBoost(event, myAnimal);
		}
	});
};
myAnimals.forEach((a: Animal) => setupBoost(a));

app.view.addEventListener?.("wheel", (event: unknown) => {
	let newZoom = Math.sign((event as { wheelDelta: number }).wheelDelta) === 1 ? zoom * 1.2 : zoom / 1.2;
	newZoom = clamp(newZoom, 4, 16);
	const originalZoom = { z: zoom };
	const zoomTween = new TWEEN.Tween(originalZoom, false)
		.to({ z: newZoom }, 100)
		.easing(TWEEN.Easing.Quadratic.Out)
		.onUpdate(() => {
			zoom = originalZoom.z;
		})
		.start();
	function animate(time: number) {
		zoomTween.update(time);
		requestAnimationFrame(animate);
	}
	requestAnimationFrame(animate);
});
