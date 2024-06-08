export function deg2rad(deg: number) {
	return deg * (Math.PI / 180);
}
export function rad2deg(rad: number) {
	return rad * (180 / Math.PI);
}
export function point2rad(x: number, y: number, centerX: number, centerY: number) {
	const dx = x - centerX;
	const dy = y - centerY;
	return Math.atan2(dy, dx);
}
export function clamp(number: number, min: number, max: number) {
	return Math.min(Math.max(number, min), max);
}

export function findNearestPointOnLine(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
	var atob = {
		x: x2 - x1,
		y: y2 - y1,
	};
	var atop = {
		x: px - x1,
		y: py - y1,
	};
	var len = atob.x * atob.x + atob.y * atob.y;
	var dot = atop.x * atob.x + atop.y * atob.y;
	var t = Math.min(1, Math.max(0, dot / len));
	dot = (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
	return {
		x: x1 + atob.x * t,
		y: y1 + atob.y * t,
	};
}

export function makeHumanReadableNumber(number: number, isXpText = false) {
	if (number < 1000) {
		return number;
	} else if (number < 1000000) {
		return (number / 1000).toFixed(1) + "k";
	} else {
		return (number / 1000000).toFixed(3) + (isXpText ? "" : "M");
	}
}
