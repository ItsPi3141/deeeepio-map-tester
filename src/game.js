import * as PIXI from "pixi.js";
import { clampCamera, createRadialGradient, renderGradientShape, renderTerrainShape, renderWaterBorder } from "./pixi-utils";

import * as planck from "planck";
import { addBoundaries, createTerrainCollider } from "./planck-utils";

import throttle from "lodash.throttle";
import * as TWEEN from "@tweenjs/tween.js";

import { clamp, point2rad } from "./math-utils";

import pointInPolygon from "robust-point-in-polygon";

import { loadAssets } from "./assetsloader";

import { getBiomes, getHidespaceById, getPropById, getShadowSize, loadMap } from "./game-utils/maploader";
import { boostPower, linearDampingFactor, planckDownscaleFactor, speedRatio } from "./objects/constants";
import { Animal } from "./objects/animal";
const map = loadMap(window.mapData);
console.log(map);

await loadAssets();

const world = new planck.World({
	gravity: planck.Vec2(0, map.settings.gravity * 3)
});

addBoundaries(world, (map.worldSize.width * 10) / planckDownscaleFactor, (map.worldSize.height * 10) / planckDownscaleFactor);

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
	object.zIndex = hidespace.id;
	if (hidespace.hSType == 21) {
		object.animation = "whirlpool";
		object.alpha /= 2;
	}

	if (hs.above && (hidespace.opacity == 1 || hidespace.opacity == undefined)) {
		hideSpacesHighLayer.addChild(object);
	} else if (hidespace.opacity != 1) {
		hideSpacesLowerLayer.addChild(object);
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

const shadowSettings = {
	alpha: 0,
	size: 0
};
function setShadowSize(size) {
	shadowLayer.removeChildren();
	if (size == 0) return;

	var leftRightHeight = window.innerHeight;
	var leftRightWidth = (window.innerWidth - size / zoom) / 2;

	var topBottomHeight = (window.innerHeight - size / zoom) / 2;
	var topBottomWidth = window.innerWidth - leftRightWidth * 2;
	const shadow = new PIXI.Graphics();
	shadow.transform.position.set(-window.innerWidth / 2, -window.innerHeight / 2);
	shadow.beginFill(0x000000);
	shadow.drawRect(0, 0, leftRightWidth, leftRightHeight);
	shadow.drawRect(window.innerWidth - leftRightWidth, 0, leftRightWidth, leftRightHeight);
	shadow.drawRect(leftRightWidth, 0, topBottomWidth, topBottomHeight);
	shadow.drawRect(leftRightWidth, window.innerHeight - topBottomHeight, topBottomWidth, topBottomHeight);

	shadow.beginTextureFill({
		texture: createRadialGradient(size / zoom, "#00000000", "#000000ff"),
		matrix: new PIXI.Matrix(1, 0, 0, 1, leftRightWidth, topBottomHeight)
	});
	shadow.drawRect(leftRightWidth, topBottomHeight, size / zoom, size / zoom);

	shadowLayer.addChild(shadow);
}
shadowLayer.alpha = 0;
setShadowSize(getShadowSize(0));

// Get habitats
const habitats = map.screenObjects.habitats?.map((h) => ({
	...h,
	points: h.points.map((p) => [p.x, p.y])
}));

// Whirlpool animation
var whirlPool = { rotation: 0 };
const whirlPoolTween = new TWEEN.Tween(whirlPool, false).to({ rotation: 360 }, 5000).easing(TWEEN.Easing.Sinusoidal.InOut).repeat(Infinity).start();
(() => {
	function animate(time) {
		whirlPoolTween.update(time);
		requestAnimationFrame(animate);
	}
	requestAnimationFrame(animate);
})();

// Render player.pixi
const myAnimals = [];
myAnimals.push(new Animal(world, 0, animalsLayer, animalsUiLayer, 1, 1, window.playerName));

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

	hideSpacesLowLayer.children.forEach((object) => {
		if (object.animation != "whirlpool") return;
		object.angle = whirlPool.rotation;
	});
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
	thisAnimal.pixiAnimalUi.setTransform(thisAnimal.animal.getPosition().x * planckDownscaleFactor, thisAnimal.animal.getPosition().y * planckDownscaleFactor - 7, 0.1, 0.1, 0);

	if (isMine) {
		const centerX = (thisAnimal.pixiAnimal.x - app.stage.pivot.x) * zoom;
		const centerY = (thisAnimal.pixiAnimal.y - app.stage.pivot.y) * zoom;
		thisAnimal.pixiAnimal.rotation = point2rad(mouseData.clientX - window.innerWidth / 2, mouseData.clientY - window.innerHeight / 2, centerX, centerY) + Math.PI / 2;

		if (isMain) {
			const viewportPos = clampCamera(thisAnimal.pixiAnimal.x, thisAnimal.pixiAnimal.y, zoom, map.worldSize.width * 10, map.worldSize.height * 10, window.innerWidth, window.innerHeight);
			app.stage.pivot.set(...viewportPos);
			shadowLayer.pivot.set(-thisAnimal.pixiAnimal.x, -thisAnimal.pixiAnimal.y);

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

			var currentBiomes = 0;
			habitats.forEach((h) => {
				if (pointInPolygon(h.points, [thisAnimal.pixiAnimal.x, thisAnimal.pixiAnimal.y]) != 1) {
					currentBiomes = currentBiomes | h.settings.area;
				}
			});
			var currentBiomesList = getBiomes(currentBiomes);
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

document.addEventListener("mousemove", (event) => {
	mouseData.clientX = event.clientX;
	mouseData.clientY = event.clientY;
});

myAnimals.forEach((animal) => {
	const throttledBoost = throttle(
		(event, animalInstance) => {
			const centerX = (animalInstance.pixiAnimal.x - app.stage.pivot.x) * zoom;
			const centerY = (animalInstance.pixiAnimal.y - app.stage.pivot.y) * zoom;
			var angle = point2rad(event.clientX - window.innerWidth / 2, event.clientY - window.innerHeight / 2, centerX, centerY);

			animalInstance.animal.applyLinearImpulse(
				planck.Vec2(
					Math.cos(angle) * animalInstance.speedFac * (animalInstance.inWater ? boostPower.water : boostPower.air),
					Math.sin(angle) * animalInstance.speedFac * (animalInstance.inWater ? boostPower.water : boostPower.air)
				),
				animalInstance.animal.getPosition()
			);
			var sf = { v: 0 };
			const boostTween = new TWEEN.Tween(sf, false)
				.to({ v: animalInstance.speedFac }, 300)
				.easing(TWEEN.Easing.Quartic.In)
				.onUpdate(() => {
					animalInstance.speedFac = sf.v;
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
		(event, animalInstance) => {
			const centerX = (animalInstance.pixiAnimal.x - app.stage.pivot.x) * zoom;
			const centerY = (animalInstance.pixiAnimal.y - app.stage.pivot.y) * zoom;
			var angle = point2rad(event.clientX - window.innerWidth / 2, event.clientY - window.innerHeight / 2, centerX, centerY);

			animalInstance.animal.applyLinearImpulse(
				planck.Vec2(Math.cos(angle) * animalInstance.speedFac * boostPower.land, Math.sin(angle) * animalInstance.speedFac * boostPower.land),
				animalInstance.animal.getPosition()
			);
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
			throttledLandhop(event, myAnimal);
		} else {
			throttledBoost(event, myAnimal);
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
