import * as PIXI from "pixi.js";
import { isClockwise, makeBrighter } from "./game-utils/maploader";

/**
 * Generates a gradient texture using the provided start and end colors.
 *
 * @param {string} startColor - The starting color of the gradient in decimal format.
 * @param {string} endColor - The ending color of the gradient in decimal format.
 * @param {number} [quality=256] - The quality of the gradient image. Defaults to 256.
 * @return {Texture} The generated gradient image as a Texture object.
 */
export function createGradient(startColor, endColor, quality = 256) {
	const canvas = document.createElement("canvas");

	canvas.width = 1;
	canvas.height = quality;

	startColor = "#" + startColor.toString(16).padStart(6, "0");
	endColor = "#" + endColor.toString(16).padStart(6, "0");

	const ctx = canvas.getContext("2d");

	// use canvas2d API to create gradient
	const grd = ctx.createLinearGradient(0, 0, 0, quality);

	grd.addColorStop(0, startColor);
	grd.addColorStop(1, endColor);

	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, 1, quality);

	return PIXI.Texture.from(canvas);
}

export function renderGradientShape(points, gradientStart, gradientStop) {
	const shape = new PIXI.Graphics();
	shape.moveTo(points[0].x, points[0].y);

	var minY = points.reduce((a, b) => (a = b.y < a ? b.y : a), Infinity);
	var maxY = points.reduce((a, b) => (a = b.y > a ? b.y : a), -Infinity);
	var shapeHeight = maxY - minY;

	if (gradientStart == gradientStop) {
		shape.beginFill(gradientStart, 1);
	} else {
		shape.beginTextureFill({
			texture: createGradient(gradientStart, gradientStop, shapeHeight),
			matrix: new PIXI.Matrix(1, 0, 0, 1, points[0].x, points[0].y)
		});
	}
	for (let i = 1; i < points.length; i++) {
		shape.lineTo(points[i].x, points[i].y);
	}
	shape.closePath();
	return shape;
}

function getTextureById(id) {
	return {
		1: "terrain",
		2: "terrain_back",
		3: "coldterrain",
		4: "coldterrain_back",
		5: "deepterrain",
		6: "beach",
		7: "beach_underwater",
		8: "swamp_island",
		9: "glacier",
		10: "reef",
		11: "reef2",
		12: "cenote1",
		13: "chalk",
		14: "clay",
		15: "estuarysand",
		16: "limestone",
		17: "rustymetal",
		18: "shallowglacier",
		19: "volcanicsand"
	}[id];
}
export function renderTerrainShape(points, texture, isBackground) {
	const shape = new PIXI.Graphics();
	shape.moveTo(points[0].x, points[0].y);

	shape.beginTextureFill({
		texture: PIXI.Texture.from(`/textures/${getTextureById(texture)}.png`),
		color: "ffffff",
		matrix: new PIXI.Matrix(0.1, 0, 0, 0.1, isBackground ? 2 : 0, isBackground ? 2 : 0)
	});
	for (let i = 1; i < points.length; i++) {
		shape.lineTo(points[i].x, points[i].y);
	}
	shape.closePath();
	return shape;
}

// top means the top half of the water border
// top does NOT mean the higher layer/zIndex
export function renderWaterBorder(points, color, isAirPocket = false) {
	const borderColor = makeBrighter(color, 1.75);
	if (isAirPocket) {
		if (isClockwise(points)) points.reverse();
	} else {
		if (!isClockwise(points)) points.reverse();
	}

	const topBorders = [];
	const bottomBorders = [];

	for (let i = 0; i < points.length; i++) {
		const current = points[i];
		const last = points[i > 0 ? i - 1 : points.length - 1];

		if (current.x > last.x && current.x - last.x > 10) {
			const top = new PIXI.Graphics();
			top.moveTo(last.x, last.y - 1.5);
			top.beginFill(borderColor);
			top.lineTo(current.x, current.y - 1.5);
			top.lineTo(current.x, current.y);
			top.lineTo(last.x, last.y);
			top.closePath();

			const bottom = new PIXI.Graphics();
			bottom.moveTo(last.x, last.y - 0.1);
			bottom.beginFill(borderColor);
			bottom.lineTo(current.x, current.y - 0.1);
			bottom.lineTo(current.x, current.y + 1.5 - 0.1);
			bottom.lineTo(last.x, last.y + 1.5 - 0.1);
			bottom.closePath();

			topBorders.push(top);
			bottomBorders.push(bottom);
		}
	}

	return {
		topBorder: topBorders,
		bottomBorder: bottomBorders
	};
}

export function clampCamera(x, y, zoom, mapW, mapH, width, height) {
	var hvw = width / 2 / zoom;
	var hvh = height / 2 / zoom;
	return [Math.max(hvw, Math.min(x, mapW - hvw)), Math.max(hvh, Math.min(y, mapH - hvh))];
}
