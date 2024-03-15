export function deg2rad(deg) {
	return deg * (Math.PI / 180);
}
export function rad2deg(rad) {
	return rad * (180 / Math.PI);
}
export function point2rad(x, y, centerX, centerY) {
	const dx = x - centerX;
	const dy = y - centerY;
	return Math.atan2(dy, dx);
}
export function clamp(number, min, max) {
	return Math.min(Math.max(number, min), max);
}

export function findNearestPointOnLine(px, py, x1, y1, x2, y2) {
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
