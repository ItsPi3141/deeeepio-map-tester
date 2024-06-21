import { type Body, Box, type DistanceJoint, Vec2, type World, type Fixture } from "planck";
import { calculateAssetSize } from "../game-utils/animal-sizing";
import { linearDampingFactor, planckDownscaleFactor, speedRatio } from "./constants";
import animals from "../game-utils/consts/animals.json";
import { Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { makeHumanReadableNumber } from "../math-utils";
import type { AnimalAbilities } from "../types";

export class Animal {
	animalData: {
		name: string;
		size?: { x: number; y: number };
		mass: number;
		boosts: number;
		level: number;
		fishLevel: number;
		oxygenTime: number;
		oxygenTimeMs: number;
		temperatureTime: number;
		temperatureTimeMs: number;
		pressureTime: number;
		pressureTimeMs: number;
		salinityTime: number;
		salinityTimeMs: number;
		speedMultiplier: number;
		walkSpeedMultiplier: number;
		jumpForceMultiplier: number;
		sizeMultiplier: number;
		sizeScale: { x: number; y: number };
		damageMultiplier: number;
		healthMultiplier: number;
		damageBlock: number;
		damageReflection: number;
		bleedReduction: number;
		armorPenetration: number;
		poisonResistance: number;
		permanentEffects: number;
		canFly: boolean;
		canSwim: boolean;
		canStand: boolean;
		needsAir: boolean;
		canClimb: boolean;
		poisonResistant: boolean;
		habitat: number;
		biomes: number[];
		collisionCategory: number;
		collisionMask: number;
		chooseable: boolean;
		hasSecondaryAbility: boolean;
		secondaryAbilityLoadTime: number;
		hasScalingBoost: boolean;
		ungrabbable: boolean;
		canDig: boolean;
		canWalkUnderwater: boolean;
		hasWalkingAbility: boolean;
		walkingAbilityLoadTime: number;
	};
	animal: Body;
	animalSize: {
		planck: {
			width: number;
			height: number;
		};
		pixi: {
			scale: number;
		};
	};
	fixture: Fixture;
	scale: number;
	pixiAnimal: Sprite;
	pixiAnimalUi: Container;
	inWater: boolean;
	prevInWater: boolean;
	doApplyForce: boolean;
	oldDoApplyForce: boolean;
	direction: number;
	walking: boolean;
	groundAnchorId: number | null;
	groundJoints: DistanceJoint[];
	speedFac: number;

	xp: number;
	xpText: Text | undefined;

	chargedBoostStartTime: number | null;
	chargedBoostBar?: Graphics;
	chargedBoostBarInner?: Graphics;
	chargedBoostPercent: number | null;

	abilities: AnimalAbilities;

	grabHookVisible: boolean;
	grabHook: Sprite;

	constructor(world: World, fishLevelId: number, pixiAnimalsLayer: Container, pixiAnimalsUiLayer: Container, x: number, y: number, name: string) {
		this.animalData = animals.find((a) => a.fishLevel === fishLevelId) || animals[0];

		try {
			this.abilities = require(`../animal-abilities/${this.animalData.name}.ts`);
		} catch {
			this.abilities = require("../animal-abilities/default.ts");
		}

		// initialize values
		this.xp = 0;

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
			bullet: true,
		});
		this.animalSize = calculateAssetSize(fishLevelId);

		this.scale = 1;
		this.fixture = this.animal.createFixture(
			Box(this.animalSize.planck.width / planckDownscaleFactor, this.animalSize.planck.height / planckDownscaleFactor),
			{
				density: 0.1,
				friction: 0.7,
				restitution: 0,
			}
		);
		this.animal.setMassData({
			mass: 1,
			center: Vec2(0, 0),
			I: 0,
		});
		this.animal.setUserData({
			increaseXp: this.increaseXp.bind(this),
		});

		// Create instance in PIXI
		this.pixiAnimal = new Sprite(Assets.get(`${this.animalData.name}.png`));
		this.pixiAnimal.anchor.set(0.5);
		this.pixiAnimal.setTransform(
			this.animal.getPosition().x * planckDownscaleFactor,
			this.animal.getPosition().y * planckDownscaleFactor,
			this.animalSize.pixi.scale,
			this.animalSize.pixi.scale,
			0
		);

		// Grab hook
		this.grabHookVisible = false;
		this.grabHook = new Sprite(Assets.get("hook.png"));
		this.grabHook.anchor.set(0.5, 0.5);
		this.grabHook.scale.set(2 / this.animalData.sizeMultiplier);
		this.grabHook.position.set(0, -150 - 120 / this.animalData.sizeMultiplier);
		this.grabHook.alpha = 0;
		this.pixiAnimal.addChild(this.grabHook);

		this.pixiAnimalUi = new Container();
		// Add name
		if (name) {
			const nameText = new Text(name, {
				fontFamily: "Quicksand",
				fontSize: 20,
				fill: 0xffffff,
				align: "center",
			});
			nameText.anchor.set(0.5);
			this.pixiAnimalUi.addChild(nameText);

			this.xpText = new Text(makeHumanReadableNumber(this.xp), {
				fontFamily: "Quicksand",
				fontSize: 14,
				fill: 0xffffff,
				align: "center",
			});
			this.xpText.position.set(0, 20);
			this.xpText.anchor.set(0.5);
			this.pixiAnimalUi.addChild(this.xpText);
		}

		// Add boost bar
		if (this.animalData.hasSecondaryAbility) {
			this.chargedBoostBar = new Graphics();
			this.chargedBoostBar.beginFill(0x000000, 0.3);
			this.chargedBoostBar.drawRect(0, 0, 16, 72);
			this.chargedBoostBar.endFill();

			this.chargedBoostBar.position.set(50 + 40 * (this.animalData.sizeMultiplier - 1), 34 + 40 * (this.animalData.sizeMultiplier - 1));

			this.chargedBoostBarInner = new Graphics();
			this.chargedBoostBarInner.beginFill(0x00edff, 0.7);
			this.chargedBoostBarInner.drawRect(2, 2, 12, 68);
			this.chargedBoostBarInner.endFill();

			this.chargedBoostBar.alpha = 0;

			this.chargedBoostBar.addChild(this.chargedBoostBarInner);
			this.pixiAnimalUi.addChild(this.chargedBoostBar);
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

		this.chargedBoostStartTime = Number.POSITIVE_INFINITY;
		this.chargedBoostPercent = 0;
	}

	get getState() {
		return this;
	}

	increaseXp(amount: number) {
		this.xp += amount;
		if (this.xpText) this.xpText.text = makeHumanReadableNumber(this.xp);
	}

	updateScale() {
		this.animal.destroyFixture(this.fixture);
		this.fixture = this.animal.createFixture(
			Box((this.animalSize.planck.width / planckDownscaleFactor) * this.scale, (this.animalSize.planck.height / planckDownscaleFactor) * this.scale),
			{
				density: 0.1,
				friction: 0.7,
				restitution: 0,
			}
		);
	}

	updateChargedBoostPercent(percent: number | null) {
		if (!this.chargedBoostBar) return;

		if (this.chargedBoostPercent !== percent) {
			if (percent === null || percent === 0) {
				this.chargedBoostBar.alpha = 0;
			} else if (this.chargedBoostBarInner) {
				this.chargedBoostBar.alpha = 1;
				const targetColor = percent === 1 ? 0x05ff00 : 0x00edff;
				if (this.chargedBoostBarInner.fill.color !== targetColor) {
					this.chargedBoostBarInner.clear();
					this.chargedBoostBarInner.beginFill(targetColor, 0.7);
					this.chargedBoostBarInner.drawRect(2, 2, 12, 68);
					this.chargedBoostBarInner.endFill();
				}
				this.chargedBoostBarInner.scale.set(1, percent);
				this.chargedBoostBarInner.position.set(0, 68 * (1 - percent));
				this.chargedBoostBar.position.set(50 + 40 * (this.animalData.sizeMultiplier - 1), 34 + 40 * (this.animalData.sizeMultiplier - 1));
			}
			this.chargedBoostPercent = percent;
		}
	}

	useSecondaryAbility(dashBoost: () => void) {
		if (this.animalData.hasSecondaryAbility) {
			this.abilities.chargedBoost(this, dashBoost);
		}
	}
}
