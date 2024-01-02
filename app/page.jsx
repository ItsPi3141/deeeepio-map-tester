"use client";

import React from "react";

export default class Home extends React.Component {
	componentDidMount() {
		require("../src/game.js");
	}
	render() {
		return (
			<main className="w-screen h-[100dvh] bg-gray-800">
				<div className="game w-full h-full"></div>
			</main>
		);
	}
}
