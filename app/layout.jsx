import { Quicksand } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({ subsets: ["latin"] });

export const metadata = {
	title: "Deeeep.io Map Preview",
	description: "Try playing your own Deeeep.io map"
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body className={quicksand.className}>{children}</body>
		</html>
	);
}
