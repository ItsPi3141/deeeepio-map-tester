import * as PIXI from "pixi.js";
import { isClockwise, makeBrighter } from "./game-utils/maploader";

export function createGradient(startColor: number, endColor: number, quality = 256): PIXI.Texture {
	const canvas: HTMLCanvasElement = document.createElement("canvas");

	canvas.width = 1;
	canvas.height = quality;

	const hexStartColor: string = `#${startColor.toString(16).padStart(6, "0")}`;
	const hexEndColor: string = `#${endColor.toString(16).padStart(6, "0")}`;

	const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");

	if (!ctx) return PIXI.Texture.EMPTY;

	// use canvas2d API to create gradient
	const grd: CanvasGradient = ctx.createLinearGradient(0, 0, 0, quality);

	grd.addColorStop(0, hexStartColor);
	grd.addColorStop(1, hexEndColor);

	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, 1, quality);

	return PIXI.Texture.from(canvas);
}

export function createRadialGradient(radius: number, startColor: string, endColor: string): PIXI.Texture {
	const canvas: HTMLCanvasElement = document.createElement("canvas");

	canvas.width = radius;
	canvas.height = radius;

	const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");

	if (!ctx) return PIXI.Texture.EMPTY;

	// use canvas2d API to create gradient
	const hr = radius / 2;
	const grd: CanvasGradient = ctx.createRadialGradient(hr, hr, 0, hr, hr, hr);

	grd.addColorStop(0, startColor);
	grd.addColorStop(1, endColor);

	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, radius, radius);

	return PIXI.Texture.from(canvas);
}

export function renderGradientShape(points: Array<{ x: number; y: number }>, gradientStart: number, gradientStop: number): PIXI.Graphics {
	const shape: PIXI.Graphics = new PIXI.Graphics();
	shape.moveTo(points[0].x, points[0].y);

	const minY: number = points.reduce((a, b) => (b.y < a ? b.y : a), Number.POSITIVE_INFINITY);
	const maxY: number = points.reduce((a, b) => (b.y > a ? b.y : a), Number.NEGATIVE_INFINITY);
	const shapeHeight: number = maxY - minY;

	if (gradientStart === gradientStop) {
		shape.beginFill(gradientStart, 1);
	} else {
		shape.beginTextureFill({
			texture: createGradient(gradientStart, gradientStop, shapeHeight),
			matrix: new PIXI.Matrix(1, 0, 0, 1, points[0].x, minY),
		});
	}
	for (let i = 1; i < points.length; i++) {
		shape.lineTo(points[i].x, points[i].y);
	}
	shape.closePath();
	return shape;
}

function getTextureById(id: number) {
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
		19: "volcanicsand",
	}[id];
}
export function renderTerrainShape(points: Array<{ x: number; y: number }>, texture: number | string, isBackground: boolean) {
	const shape: PIXI.Graphics = new PIXI.Graphics();
	shape.moveTo(points[0].x, points[0].y);

	shape.beginTextureFill({
		texture:
			typeof texture === "number"
				? PIXI.Texture.from(`/textures/${getTextureById(texture)}.png`)
				: PIXI.Texture.from(texture.replace("assets/terrains", "/textures")),
		color: "ffffff",
		matrix: new PIXI.Matrix(0.1, 0, 0, 0.1, isBackground ? 2 : 0, isBackground ? 2 : 0),
	});
	for (let i = 1; i < points.length; i++) {
		shape.lineTo(points[i].x, points[i].y);
	}
	shape.closePath();
	return shape;
}

// top means the top half of the water border
// top does NOT mean the higher layer/zIndex
export function renderWaterBorder(
	points: Array<{ x: number; y: number }>,
	color: number,
	isAirPocket = false
): {
	topBorder: Array<PIXI.Graphics>;
	bottomBorder: Array<PIXI.Graphics>;
} {
	const borderColor = makeBrighter(color, 1.75);
	if (isAirPocket) {
		if (isClockwise(points)) points.reverse();
	} else {
		if (!isClockwise(points)) points.reverse();
	}

	const topBorders: Array<PIXI.Graphics> = [];
	const bottomBorders: Array<PIXI.Graphics> = [];

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
		bottomBorder: bottomBorders,
	};
}

export function clampCamera(x: number, y: number, zoom: number, mapW: number, mapH: number, width: number, height: number) {
	const hvw: number = width / 2 / zoom;
	const hvh: number = height / 2 / zoom;
	return [Math.max(hvw, Math.min(x, mapW - hvw)), Math.max(hvh, Math.min(y, mapH - hvh))];
}
