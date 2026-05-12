import * as PIXI from "pixi.js";
import { gameState, type LayerRefs } from "./game-state";
import { createRadialGradient } from "../pixi-utils";

const shadowSettings = gameState.shadowSettings;

export function setShadowSize(size: number, zoom: number, shadowLayer: PIXI.Container) {
	shadowLayer.removeChildren();
	if (size === 0) return;

	const leftRightHeight = window.innerHeight;
	const leftRightWidth = (window.innerWidth - size / zoom) / 2;

	const topBottomHeight = (window.innerHeight - size / zoom) / 2;
	const topBottomWidth = window.innerWidth - leftRightWidth * 2;
	const shadow = new PIXI.Graphics();
	shadow.position.set(-window.innerWidth / 2, -window.innerHeight / 2);
	shadow
		.rect(0, 0, leftRightWidth, leftRightHeight)
		.rect(window.innerWidth - leftRightWidth, 0, leftRightWidth, leftRightHeight)
		.rect(leftRightWidth, 0, topBottomWidth, topBottomHeight)
		.rect(leftRightWidth, window.innerHeight - topBottomHeight, topBottomWidth, topBottomHeight)
		.fill(0x000000);

	shadow.rect(leftRightWidth, topBottomHeight, size / zoom, size / zoom).fill({
		texture: createRadialGradient(size / zoom, [
			{ offset: 0, color: "#00000000" },
			{ offset: 0.25, color: "#0000000f" },
			{ offset: 0.5, color: "#0000003f" },
			{ offset: 0.75, color: "#0000008f" },
			{ offset: 1, color: "#000000ff" },
		]),
	});

	shadowLayer.addChild(shadow);
}

export { shadowSettings };
