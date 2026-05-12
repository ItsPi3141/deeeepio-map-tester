import * as planck from "planck";
import * as TWEEN from "@tweenjs/tween.js";
import throttle from "lodash.throttle";
import { gameState } from "./game-state";
import { point2rad, clamp } from "../math-utils";
import { boostPower, linearDampingFactor, planckDownscaleFactor } from "../objects/constants";
import type { Animal } from "../objects/animal";

export function initMouseTracking() {
	const s = gameState;
	document.addEventListener("mousemove", (event) => {
		s.mouseData.clientX = event.clientX;
		s.mouseData.clientY = event.clientY;
	});
}

export const setupBoost = (animal: Animal) => {
	const s = gameState;
	const app = s.app!;

	const throttledBoost = throttle(
		(event, animalInstance) => {
			const centerX = (animalInstance.pixiAnimal.x - app.stage.pivot.x) * s.zoom;
			const centerY = (animalInstance.pixiAnimal.y - app.stage.pivot.y) * s.zoom;
			const angle = point2rad(
				event.clientX - window.innerWidth / 2,
				event.clientY - window.innerHeight / 2,
				centerX,
				centerY,
			);

			animalInstance.animal.applyLinearImpulse(
				new planck.Vec2(
					Math.cos(angle) * animalInstance.speedFac * (animalInstance.inWater ? boostPower.water : boostPower.air),
					Math.sin(angle) * animalInstance.speedFac * (animalInstance.inWater ? boostPower.water : boostPower.air),
				),
				animalInstance.animal.getPosition(),
			);
			const sf = { v: 0 };
			const boostTween = new TWEEN.Tween(sf)
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
			return true;
		},
		850,
		{ trailing: false },
	);
	const throttledLandhop = throttle(
		(event, animalInstance) => {
			const centerX = (animalInstance.pixiAnimal.x - app.stage.pivot.x) * s.zoom;
			const centerY = (animalInstance.pixiAnimal.y - app.stage.pivot.y) * s.zoom;
			const angle = point2rad(
				event.clientX - window.innerWidth / 2,
				event.clientY - window.innerHeight / 2,
				centerX,
				centerY,
			);

			animalInstance.animal.applyLinearImpulse(
				new planck.Vec2(
					Math.cos(angle) * animalInstance.speedFac * boostPower.land,
					Math.sin(angle) * animalInstance.speedFac * boostPower.land,
				),
				animalInstance.animal.getPosition(),
			);
		},
		150,
		{ trailing: false },
	);

	app.canvas.addEventListener("mousedown", (event: Event) => {
		// left click
		if ((event as MouseEvent).which === 1) {
			const myAnimal = animal.getState;

			if (myAnimal.animalData.hasSecondaryAbility) {
				myAnimal.chargedBoostStartTime = Date.now();
			}
		}
	});
	app.canvas.addEventListener("mouseup", (event: Event) => {
		const myAnimal = animal.getState;

		// right click
		if ((event as MouseEvent).which === 3) {
			myAnimal.chargedBoostStartTime = null;
			return;
		}

		if (
			myAnimal.animalData.hasSecondaryAbility &&
			typeof myAnimal.chargedBoostStartTime === "number" &&
			Date.now() - myAnimal.chargedBoostStartTime > myAnimal.animalData.secondaryAbilityLoadTime
		) {
			myAnimal.useSecondaryAbility(throttledBoost.bind(null, event, myAnimal));
		} else if (
			(myAnimal.animalData.hasSecondaryAbility &&
				typeof myAnimal.chargedBoostStartTime === "number" &&
				Date.now() - myAnimal.chargedBoostStartTime < myAnimal.animalData.secondaryAbilityLoadTime) ||
			!myAnimal.animalData.hasSecondaryAbility
		) {
			let landhop = false;

			if (!myAnimal.inWater) {
				const contact = [];
				for (let ce = myAnimal.animal.getContactList(); ce; ce = ce.next) {
					contact.push(ce);
				}
				try {
					if (
						contact.filter(
							(c: planck.ContactEdge) =>
								((c.other as planck.Body).getUserData() as { type: string }).type === "terrainTop",
						).length > 0
					) {
						landhop = true;
					}
				} catch {}
			}

			if (landhop) {
				throttledLandhop(event, myAnimal);
			} else if (!myAnimal.walking) {
				throttledBoost(event, myAnimal);
			}
		}
		myAnimal.chargedBoostStartTime = null;
	});
	app.canvas.addEventListener("contextmenu", (event: Event) => {
		event.preventDefault();
		const myAnimal = animal.getState;
		myAnimal.chargedBoostStartTime = null;
	});
};

export function initZoomControls() {
	const s = gameState;
	const app = s.app!;

	app.canvas.addEventListener("wheel", (event: unknown) => {
		let newZoom = Math.sign((event as { wheelDelta: number }).wheelDelta) === 1 ? s.zoom * 1.2 : s.zoom / 1.2;
		newZoom = clamp(newZoom, 4, 16);
		const originalZoom = { z: s.zoom };
		const zoomTween = new TWEEN.Tween(originalZoom)
			.to({ z: newZoom }, 100)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onUpdate(() => {
				s.zoom = originalZoom.z;
			})
			.start();
		function animate(time: number) {
			zoomTween.update(time);
			requestAnimationFrame(animate);
		}
		requestAnimationFrame(animate);
	});
}
