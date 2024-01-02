import { Box, Vec2 } from "planck";
import { calculateAssetSize } from "../game-utils/animal-sizing";
import { linearDampingFactor, planckDownscaleFactor, speedRatio } from "./constants";
import animals from "../game-utils/consts/animals.json";
import { Sprite, Texture } from "pixi.js";

export class Animal {
	constructor(world, fishLevelId, pixiAnimalsLayer, x, y) {
		// Create Planck.js body
		this.animal = world.createBody({
			type: "dynamic",
			position: Vec2(x, y),
			angle: 0,
			linearDamping: linearDampingFactor,
			angularDamping: 0.01,
			allowSleep: false,
			awake: true,
			gravityScale: 0,
			bullet: true
		});
		this.animalSize = calculateAssetSize(fishLevelId);

		this.animal.createFixture(Box(this.animalSize.planck.width / planckDownscaleFactor, this.animalSize.planck.height / planckDownscaleFactor), {
			density: 0.1,
			friction: 0.5,
			restitution: 0
		});
		this.animal.setMassData({ mass: 1, center: Vec2(0, 0) });

		// Create instance in PIXI
		this.pixiAnimal = new Sprite(Texture.from(`/animals/${animals.find((a) => a.fishLevel == fishLevelId).name}.png`));
		this.pixiAnimal.anchor.set(0.5);
		this.pixiAnimal.setTransform(
			this.animal.getPosition().x * planckDownscaleFactor,
			this.animal.getPosition().y * planckDownscaleFactor,
			this.animalSize.pixi.scale,
			this.animalSize.pixi.scale,
			0
		);
		pixiAnimalsLayer.addChild(this.pixiAnimal);

		this.inWater = false;
		this.prevInWater = false;

		this.doApplyForce = true;
		this.oldDoApplyForce = true;

		this.speedFac = linearDampingFactor * speedRatio;
	}

	get getState() {
		return this;
	}
}
