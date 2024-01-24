import { Box, Vec2 } from "planck";
import { calculateAssetSize } from "../game-utils/animal-sizing";
import { linearDampingFactor, planckDownscaleFactor, speedRatio } from "./constants";
import animals from "../game-utils/consts/animals.json";
import { Container, Sprite, Text, Texture } from "pixi.js";

export class Animal {
	constructor(world, fishLevelId, pixiAnimalsLayer, pixiAnimalsUiLayer, x, y, name) {
		this.animalData = animals.find((a) => a.fishLevel == fishLevelId);

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
			friction: 0.7,
			restitution: 0
		});
		this.animal.setMassData({ mass: 1, center: Vec2(0, 0) });

		// Create instance in PIXI
		this.pixiAnimal = new Sprite(Texture.from(`/animals/${this.animalData.name}.png`));
		this.pixiAnimal.anchor.set(0.5);
		this.pixiAnimal.setTransform(
			this.animal.getPosition().x * planckDownscaleFactor,
			this.animal.getPosition().y * planckDownscaleFactor,
			this.animalSize.pixi.scale,
			this.animalSize.pixi.scale,
			0
		);

		this.pixiAnimalUi = new Container();
		// Add name
		if (name) {
			const nameText = new Text(name, {
				fontFamily: "Quicksand",
				fontSize: 20,
				fill: 0xffffff,
				align: "center"
			});
			nameText.anchor.set(0.5);
			this.pixiAnimal.setTransform(this.animal.getPosition().x * planckDownscaleFactor, this.animal.getPosition().y * planckDownscaleFactor - 7, 0.1, 0.1, 0);
			this.pixiAnimalUi.addChild(nameText);
		}

		pixiAnimalsUiLayer.addChild(this.pixiAnimalUi);
		pixiAnimalsLayer.addChild(this.pixiAnimal);

		this.inWater = false;
		this.prevInWater = false;

		this.doApplyForce = true;
		this.oldDoApplyForce = true;
		this.direction = 0;

		this.walking = false;
		this.groundAnchorId = null;
		this.groundJoints = [];

		this.speedFac = linearDampingFactor * speedRatio;
	}

	get getState() {
		return this;
	}
}
