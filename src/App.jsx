import React, { useEffect, useMemo, useState } from "react";
import PortfolioGame from "./PortfolioGame";
import PortfolioNav from "./ui/chrome/PortfolioNav";
import { roomByRoute, roomOrder, roomRegistry } from "./rooms/registry";

const getRoomIdFromPath = (pathname) => roomByRoute[pathname] || "intro";

export default function App() {
	const [activeRoomId, setActiveRoomId] = useState(getRoomIdFromPath(window.location.pathname));
	const [pendingSpawnId, setPendingSpawnId] = useState("default");
	const rooms = useMemo(() => roomOrder.map((id) => roomRegistry[id]), []);

	useEffect(() => {
		const syncFromLocation = () => {
			setActiveRoomId(getRoomIdFromPath(window.location.pathname));
		};

		const onRouteEvent = () => syncFromLocation();
		const onPopState = () => syncFromLocation();

		window.addEventListener("portfolio-route-change", onRouteEvent);
		window.addEventListener("popstate", onPopState);
		return () => {
			window.removeEventListener("portfolio-route-change", onRouteEvent);
			window.removeEventListener("popstate", onPopState);
		};
	}, []);

	const onNavigate = (roomId, spawnId = "default") => {
		const room = roomRegistry[roomId] || roomRegistry.intro;
		const nextPath = room.route;
		setPendingSpawnId(spawnId);
		if (window.location.pathname !== nextPath || window.location.search) {
			window.history.pushState({}, "", nextPath);
		}
		window.dispatchEvent(
			new CustomEvent("portfolio-route-change", {
				detail: { path: nextPath, source: "nav" },
			})
		);
	};

	return (
		<div className="app-shell">
			<PortfolioNav rooms={rooms} activeRoomId={activeRoomId} onNavigate={onNavigate} />
			<main className="app-main" aria-label="Portfolio RPG viewport">
				<PortfolioGame roomId={activeRoomId} spawnId={pendingSpawnId} onNavigate={onNavigate} />
			</main>
		</div>
	);
}
