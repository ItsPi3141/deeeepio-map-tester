import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
	subsets: ["latin", "latin-ext", "vietnamese"],
	fallback: ["sans-serif"],
	preload: true,
});

export const metadata = {
	title: "Deeeep.io Map Preview",
	description: "Try playing your own Deeeep.io map",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={quicksand.className}>{children}</body>
		</html>
	);
}
