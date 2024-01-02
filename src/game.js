import * as PIXI from "pixi.js";
import { clampCamera, renderGradientShape, renderTerrainShape, renderWaterBorder } from "./pixi-utils";

import * as planck from "planck";
import { addBoundaries, createTerrainCollider } from "./planck-utils";

import throttle from "lodash.throttle";
import * as TWEEN from "@tweenjs/tween.js";

import { clamp, point2rad } from "./math-utils";

import pointInPolygon from "robust-point-in-polygon";

import { loadAssets } from "./assetsloader";

import { getHidespaceById, getPropById, loadMap } from "./game-utils/maploader";
import { boostPower, linearDampingFactor, planckDownscaleFactor, speedRatio } from "./objects/constants";
import { Animal } from "./objects/animal";
const map = loadMap(require("./star_rain_ffa.json"));
console.log(map);

await loadAssets();

const world = new planck.World({
	gravity: planck.Vec2(0, map.settings.gravity * 3)
});

addBoundaries(world, map.worldSize.width * 10, map.worldSize.height * 10);

map.screenObjects.terrains?.forEach((terrain) => {
	createTerrainCollider(world, terrain, planckDownscaleFactor);
});
map.screenObjects.islands?.forEach((island) => {
	createTerrainCollider(world, island, planckDownscaleFactor);
});

var zoom = 8;

// Create game canvas
const app = new PIXI.Application({
	backgroundColor: 0x1f2937,
	backgroundAlpha: 0,
	autoResize: true,
	resizeTo: document.querySelector("main > div.game"),
	resolution: window.devicePixelRatio,
	antialias: true,
	clearBeforeRender: true
});
document.querySelector("main > div.game").appendChild(app.view);

// Layer order from top to bottom:
// currents
// ceilings
// terrains
// *top water border
// islands
// props
// hide-spaces (above animals)
// animals
// hide-spaces (below animals)
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

const hideSpacesLowLayer = new PIXI.Container();
app.stage.addChild(hideSpacesLowLayer);

const platformsLayer = new PIXI.Container();
app.stage.addChild(platformsLayer);

const animalsLayer = new PIXI.Container();
app.stage.addChild(animalsLayer);

const hideSpacesHighLayer = new PIXI.Container();
app.stage.addChild(hideSpacesHighLayer);

const propsLayer = new PIXI.Container();
app.stage.addChild(propsLayer);

const islandsLayer = new PIXI.Container();
app.stage.addChild(islandsLayer);

const waterBorderHighLayer = new PIXI.Container();
app.stage.addChild(waterBorderHighLayer);

const terrainsLayer = new PIXI.Container();
app.stage.addChild(terrainsLayer);

const ceilingsLayer = new PIXI.Container();
app.stage.addChild(ceilingsLayer);

const currentsLayer = new PIXI.Container();
app.stage.addChild(currentsLayer);

app.ticker.add((dt) => {
	update(dt);
});

const waterObjects = [];
const airPocketObjects = [];
// one-time rendering
// Render map
map.screenObjects.sky?.forEach((sky) => {
	const shape = renderGradientShape(sky.points, sky.colors[0], sky.colors[1]);
	skyLayer.addChild(shape);
});
map.screenObjects.water?.forEach((water) => {
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
map.screenObjects["air-pockets"]?.forEach((airpocket) => {
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
map.screenObjects["background-terrains"]?.forEach((bgterrain) => {
	const shape = renderTerrainShape(bgterrain.points, bgterrain.texture, true);
	shape.alpha = bgterrain.opacity;
	backgroundTerrainsLayer.addChild(shape);
});
map.screenObjects.platforms?.forEach((platform) => {
	const shape = renderTerrainShape(platform.points, platform.texture, false);
	platformsLayer.addChild(shape);
});
map.screenObjects.islands?.forEach((island) => {
	const shape = renderTerrainShape(island.points, island.texture, false);
	islandsLayer.addChild(shape);
});
map.screenObjects.terrains?.forEach((terrain) => {
	const shape = renderTerrainShape(terrain.points, terrain.texture, false);
	terrainsLayer.addChild(shape);
});
map.screenObjects.ceilings?.forEach((ceiling) => {
	const shape = renderTerrainShape(ceiling.points, ceiling.texture, false);
	shape.points = ceiling.points.map((p) => [p.x, p.y]);
	ceilingsLayer.addChild(shape);
});

map.screenObjects["hide-spaces"]?.forEach((hidespace) => {
	const hs = getHidespaceById(hidespace.hSType);
	const object = new PIXI.Sprite(PIXI.Assets.get(hs.asset));
	object.width = hs.width * 10;
	object.height = hs.height * 10;
	object.anchor.set(hs.anchor_x, hs.anchor_y);
	object.position.set(hidespace.x, hidespace.y);
	object.alpha = hidespace.opacity || 1;
	object.angle = hidespace.rotation;

	if (hs.above) {
		hideSpacesHighLayer.addChild(object);
	} else {
		hideSpacesLowLayer.addChild(object);
	}
});

map.screenObjects.props?.forEach((prop) => {
	const p = getPropById(prop.pType);
	const object = new PIXI.Sprite(PIXI.Assets.get(p.asset));
	object.width = p.width * 10;
	object.height = p.height * 10;
	object.anchor.set(p.anchor_x, p.anchor_y);
	object.position.set(prop.x, prop.y);
	object.angle = prop.rotation;

	// Message sign
	if (p.id == 1 && prop.params?.text) {
		const text = new PIXI.Text(prop.params.text, {
			fontFamily: "Quicksand",
			fontSize: 24,
			fill: 0x7f694e,
			align: "center",
			wordWrapWidth: 300,
			trim: true,
			wordWrap: true,
			breakWords: true,
			fontWeight: "bolder"
		});
		text.anchor.set(0.5);
		text.localTransform.setTransform(0, -350, 0, 0, 1, 1, 0, 0, 0);
		object.addChild(text);
	}

	propsLayer.addChild(object);
});

// Get habitats
const habitats = map.screenObjects.habitats?.map((h) => ({
	...h,
	points: h.points.map((p) => [p.x, p.y])
}));

// Render player.pixi
const myAnimals = [];
myAnimals.push(new Animal(world, 0, animalsLayer, 1, 1));

const mouseData = {
	clientX: 0,
	clientY: 0
};

function update(dt) {
	app.stage.position.set(window.innerWidth / 2, window.innerHeight / 2);
	app.stage.scale.set(zoom);

	myAnimals.forEach((animal, index) => {
		updateAnimal(animal, true, index == 0);
	});

	world.step((app.ticker.elapsedMS / 1000) * dt, 8, 5);
}

function updateAnimal(animal, isMine, isMain = false) {
	var thisAnimal = animal.getState;
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
				) == -1,
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
		thisAnimal.doApplyForce = false;
		thisAnimal.animal.setGravityScale(1);
		thisAnimal.animal.setLinearDamping(0.1);
	} else {
		thisAnimal.animal.setGravityScale(0);
		thisAnimal.animal.setLinearDamping(linearDampingFactor);
	}

	var spdf = thisAnimal.speedFac * (thisAnimal.doApplyForce ? 1 : 0);

	if (thisAnimal.doApplyForce != thisAnimal.oldDoApplyForce && thisAnimal.oldDoApplyForce == true && thisAnimal.inWater) {
		setTimeout(() => {
			thisAnimal.animal.setLinearDamping(linearDampingFactor);
		}, 100);
		thisAnimal.animal.setLinearDamping(linearDampingFactor * 2);
	}

	const rotation = thisAnimal.pixiAnimal.rotation - Math.PI / 2;

	thisAnimal.animal.setAngle(thisAnimal.pixiAnimal.rotation);
	thisAnimal.animal.applyForce(planck.Vec2(Math.cos(rotation) * spdf, Math.sin(rotation) * spdf), thisAnimal.animal.getPosition());

	thisAnimal.pixiAnimal.setTransform(
		thisAnimal.animal.getPosition().x * planckDownscaleFactor,
		thisAnimal.animal.getPosition().y * planckDownscaleFactor,
		thisAnimal.animalSize.pixi.scale,
		thisAnimal.animalSize.pixi.scale,
		thisAnimal.pixiAnimal.rotation
	);

	if (isMine) {
		const centerX = (thisAnimal.pixiAnimal.x - app.stage.pivot.x) * zoom;
		const centerY = (thisAnimal.pixiAnimal.y - app.stage.pivot.y) * zoom;
		thisAnimal.pixiAnimal.rotation = point2rad(mouseData.clientX - window.innerWidth / 2, mouseData.clientY - window.innerHeight / 2, centerX, centerY) + Math.PI / 2;

		if (isMain) {
			app.stage.pivot.set(...clampCamera(thisAnimal.pixiAnimal.x, thisAnimal.pixiAnimal.y, zoom, map.worldSize.width * 10, map.worldSize.height * 10, window.innerWidth, window.innerHeight));

			ceilingsLayer.children.forEach((c) => {
				if ([-1, 0].includes(pointInPolygon(c.points, [thisAnimal.pixiAnimal.x, thisAnimal.pixiAnimal.y - (thisAnimal.inWater ? 0 : 2)]))) {
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
		}
	}
}

document.addEventListener("mousemove", (event) => {
	mouseData.clientX = event.clientX;
	mouseData.clientY = event.clientY;
});

myAnimals.forEach((animal) => {
	const throttledBoost = throttle(
		(event, animal, animalPixi, speedFac, inWater) => {
			const centerX = (animalPixi.x - app.stage.pivot.x) * zoom;
			const centerY = (animalPixi.y - app.stage.pivot.y) * zoom;
			var angle = point2rad(event.clientX - window.innerWidth / 2, event.clientY - window.innerHeight / 2, centerX, centerY);

			animal.applyLinearImpulse(
				planck.Vec2(Math.cos(angle) * speedFac * (inWater ? boostPower.water : boostPower.air), Math.sin(angle) * speedFac * (inWater ? boostPower.water : boostPower.air)),
				animal.getPosition()
			);
			var sf = { v: 0 };
			const boostTween = new TWEEN.Tween(sf, false)
				.to({ v: speedFac }, 300)
				.easing(TWEEN.Easing.Quartic.In)
				.onUpdate(() => {
					speedFac = sf.v;
				})
				.start();
			function boost(time) {
				boostTween.update(time);
				requestAnimationFrame(boost);
			}
			requestAnimationFrame(boost);
		},
		850,
		{ trailing: false }
	);
	const throttledLandhop = throttle(
		(event, animal, animalPixi, speedFac) => {
			const centerX = (animalPixi.x - app.stage.pivot.x) * zoom;
			const centerY = (animalPixi.y - app.stage.pivot.y) * zoom;
			var angle = point2rad(event.clientX - window.innerWidth / 2, event.clientY - window.innerHeight / 2, centerX, centerY);

			animal.applyLinearImpulse(planck.Vec2(Math.cos(angle) * speedFac * boostPower.land, Math.sin(angle) * speedFac * boostPower.land), animal.getPosition());
		},
		150,
		{ trailing: false }
	);

	app.view.addEventListener("click", (event) => {
		const myAnimal = animal.getState;

		var landhop = false;

		if (!myAnimal.inWater) {
			var contact = [];
			for (let ce = myAnimal.animal.getContactList(); ce; ce = ce.next) {
				contact.push(ce);
			}
			try {
				if (contact.filter((c) => c.other.getUserData().type == "terrainTop").length > 0) {
					landhop = true;
				}
			} catch {}
		}

		if (landhop) {
			throttledLandhop(event, myAnimal.animal, myAnimal.pixiAnimal, myAnimal.speedFac);
		} else {
			throttledBoost(event, myAnimal.animal, myAnimal.pixiAnimal, myAnimal.speedFac, myAnimal.inWater);
		}
	});
});
app.view.addEventListener("wheel", (event) => {
	var newZoom = Math.sign(event.wheelDelta) == 1 ? zoom * 1.2 : zoom / 1.2;
	newZoom = clamp(newZoom, 4, 16);
	var originalZoom = { z: zoom };
	const zoomTween = new TWEEN.Tween(originalZoom, false)
		.to({ z: newZoom }, 100)
		.easing(TWEEN.Easing.Quadratic.Out)
		.onUpdate(() => {
			zoom = originalZoom.z;
		})
		.start();
	function animate(time) {
		zoomTween.update(time);
		requestAnimationFrame(animate);
	}
	requestAnimationFrame(animate);
});
