export interface DeeeepioMap {
	id: number;
	user_id: number;
	cloneof_id: number | null;
	string_id: string;
	title: string;
	description: string;
	data: string;
	public: boolean;
	locked: boolean;
	clonable: boolean;
	permissions: number;
	likes: number;
	objects: number;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	user: DeeeepioUser;
	tags: {
		id: string;
	}[];
}

export interface DeeeepioUser {
	id: number;
	username: string;
	description: string;
	about: string;
	team_id: number | null;
	team_role: number | null;
	date_created: string;
	date_last_played: string;
	kill_count: number;
	play_count: number;
	highest_score: number;
	picture: string;
	displayPicture: boolean;
	active: boolean;
	ban_message: string | null;
	coins: number;
	tier: number;
	xp: number;
	migrated: boolean;
	verified: boolean;
	beta: boolean;
}

export interface DeeeepioMapData {
	screenObjects: DeeeepioMapScreenObject[];
	settings: {
		gravity: number;
	};
	worldSize: {
		width: string;
		height: string;
	};
}

export interface DeeeepioMapScreenObject {
	id: number;
	type: string;
	layerId: string;
	points: {
		x: number;
		y: number;
	}[];
	position: {
		x: number;
		y: number;
	};
	size: {
		width: number;
		height: number;
	};
	settings: {
		collidable: boolean;
		angle: number;
		strength: number;
		foodIds: number[];
		count: number;
		firstSpawnMs: number | null;
		reSpawnMs: number | null;
		area: number;
		onlyOnWater: boolean;
		fishLevels: number[];
		animalCount: number;
		npcType: number;
		restrictMovement: boolean;
	};
	triggers: {
		actions: {
			type: number;
			data: {
				pos: {
					x: number;
					y: number;
				};
			};
		}[];
		delay: number;
		when: number;
	}[];
	texture: number;
	foodSpawnSettings: {
		foodIds: number[];
		count: number;
		firstSpawnMs: number | null;
		reSpawnMs: number | null;
		area: number;
	};
	x: number;
	y: number;
	rotation: number;
	pType: number;
	params: {
		text: string;
	};
	hSType: number;
	opacity: number;
	borderColor: number;
	colors: number[];
	hasBorder: boolean;
}
