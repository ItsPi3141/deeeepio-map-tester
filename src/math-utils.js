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
