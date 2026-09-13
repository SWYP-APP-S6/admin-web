import { useCallback, useEffect, useState } from "react";
import { setOverrideTokenRenewal } from "../api/client";
import { logoutAppUser, refreshAppUser } from "../api/consumerAuth";
import { fetchMyStore, fetchOwnerHome } from "../api/owner";
import { InboxScreen } from "../app/InboxScreen";
import { ErrorNote, Loading, asError, codeOf } from "../app/shared";
import { OwnerHomeScreen } from "../owner/HomeScreen";
import { OwnerHoldDetailScreen } from "../owner/HoldDetailScreen";
import { LoginScreen } from "../owner/LoginScreen";
import { ProductDetailScreen } from "../owner/ProductDetailScreen";
import { ProductRegisterScreen } from "../owner/ProductRegisterScreen";
import { SettingsScreen } from "../owner/SettingsScreen";
import { StoreManageScreen } from "../owner/StoreManageScreen";
import { StoreRegisterScreen } from "../owner/StoreRegisterScreen";
import { loadOwnerSession, saveOwnerSession } from "../owner/session";
import type { OwnerSession } from "../owner/session";
import type { OwnerHome, StoreDetail } from "../types";

type Tab = "home" | "manage" | "settings";

type Route =
	| { name: "tab"; tab: Tab }
	| { name: "inbox" }
	| { name: "productRegister" }
	| { name: "product"; productId: number }
	| { name: "hold"; holdId: number };

const TABS: { tab: Tab; label: string }[] = [
	{ tab: "home", label: "홈" },
	{ tab: "manage", label: "점포 관리" },
	{ tab: "settings", label: "설정" },
];

const TITLE: Record<Tab, string> = {
	home: "점주용",
	manage: "점포 관리",
	settings: "설정",
};

/**
 * 점주 앱(피그마 O-0xx)을 실제 API 로 돌려보는 화면. 소비자 앱 테스트(/app)와 세션 키가 갈려
 * 있어 두 탭을 동시에 띄우고 "소비자가 찜하면 점주 화면에 뜨는가"를 볼 수 있다.
 */
export function OwnerAppPage() {
	const [session, setSession] = useState<OwnerSession>(() => loadOwnerSession());
	const [stack, setStack] = useState<Route[]>([{ name: "tab", tab: "home" }]);
	const [home, setHome] = useState<OwnerHome | null>(null);
	const [store, setStore] = useState<StoreDetail | null>(null);
	const [needsStore, setNeedsStore] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [loading, setLoading] = useState(false);
	const [unread, setUnread] = useState(0);
	const [expired, setExpired] = useState(false);

	const token = session.kind === "user" ? session.accessToken : null;
	const current = stack[stack.length - 1];
	const tabRoute = [...stack].reverse().find((route) => route.name === "tab");
	const activeTab: Tab = tabRoute && tabRoute.name === "tab" ? tabRoute.tab : "home";

	// 점주 토큰도 30분이면 만료된다. 카카오 로그인이면 refresh 로 되살리고, 테스트 토큰은
	// refresh 가 없으므로 로그인 화면으로 돌려보낸다 -- 안 그러면 화면마다 401 만 뜬다.
	useEffect(() => {
		setOverrideTokenRenewal(async () => {
			const stored = loadOwnerSession();
			if (stored.kind === "user" && stored.refreshToken) {
				try {
					const tokens = await refreshAppUser(stored.refreshToken);
					const next: OwnerSession = { ...stored, ...tokens };
					saveOwnerSession(next);
					setSession(next);
					return tokens.accessToken;
				} catch {
					// 갱신 실패는 곧 세션 종료다.
				}
			}
			saveOwnerSession({ kind: "none" });
			setSession({ kind: "none" });
			setExpired(true);
			return null;
		});
		return () => setOverrideTokenRenewal(null);
	}, []);

	const reload = useCallback(async () => {
		if (!token) {
			return;
		}
		setLoading(true);
		try {
			const [loadedHome, loadedStore] = await Promise.all([
				fetchOwnerHome(token),
				fetchMyStore(token),
			]);
			setHome(loadedHome);
			setStore(loadedStore);
			setUnread(loadedHome.unreadNotificationCount);
			setNeedsStore(false);
			setError(null);
		} catch (caught) {
			const failure = asError(caught);
			if (codeOf(failure) === "STORE_NOT_REGISTERED") {
				setNeedsStore(true);
				setError(null);
			} else {
				setError(failure);
			}
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		void reload();
	}, [reload]);

	function apply(next: OwnerSession) {
		saveOwnerSession(next);
		setSession(next);
		setStack([{ name: "tab", tab: "home" }]);
		setHome(null);
		setStore(null);
		setNeedsStore(false);
		setExpired(false);
	}

	async function signOut() {
		if (session.kind === "user" && session.refreshToken) {
			await logoutAppUser(session.refreshToken).catch(() => undefined);
		}
		apply({ kind: "none" });
	}

	function push(route: Route) {
		setStack((routes) => [...routes, route]);
	}

	function back() {
		setStack((routes) => (routes.length > 1 ? routes.slice(0, -1) : routes));
	}

	if (session.kind === "none") {
		return (
			<div className="app-frame">
				{expired && (
					<p className="state state--error" style={{ margin: "14px 14px 0" }}>
						로그인 세션이 만료돼 처음 화면으로 돌아왔습니다.
					</p>
				)}
				<LoginScreen onSignedIn={apply} />
			</div>
		);
	}

	if (needsStore && token) {
		return (
			<div className="app-frame">
				<header className="app-bar">
					<span className="app-bar__back" />
					<span className="app-bar__title">상점 정보</span>
					<button className="app-bar__realm" type="button" onClick={signOut}>
						로그아웃
					</button>
				</header>
				<div className="app-body">
					<StoreRegisterScreen
						accessToken={token}
						onRegistered={(registered) => {
							setStore(registered);
							setNeedsStore(false);
							void reload();
						}}
					/>
				</div>
			</div>
		);
	}

	const title =
		current.name === "tab"
			? TITLE[current.tab]
			: current.name === "inbox"
				? "알림"
				: current.name === "productRegister"
					? "상품 등록"
					: current.name === "product"
						? "상품 관리 상세"
						: "찜 상세";

	return (
		<div className="app-frame">
			<header className="app-bar">
				{stack.length > 1 ? (
					<button className="app-bar__back" type="button" onClick={back}>
						←
					</button>
				) : (
					<span className="app-bar__back" />
				)}
				<span className="app-bar__title">{title}</span>
				<button
					className="app-bar__realm"
					type="button"
					onClick={() => push({ name: "inbox" })}
				>
					🔔{unread > 0 ? ` ${unread}` : ""}
				</button>
			</header>

			<div className="app-body">
				{error && <ErrorNote error={error} />}
				{!home && loading && <Loading />}

				{home && token && current.name === "tab" && current.tab === "home" && (
					<OwnerHomeScreen
						home={home}
						onOpenProduct={(productId) => push({ name: "product", productId })}
						onOpenHold={(holdId) => push({ name: "hold", holdId })}
						onRegisterProduct={() => push({ name: "productRegister" })}
						onOpenHolds={() => setStack([{ name: "tab", tab: "manage" }])}
					/>
				)}

				{home && token && current.name === "tab" && current.tab === "manage" && (
					<StoreManageScreen
						home={home}
						accessToken={token}
						initialTab="holds"
						onOpenProduct={(productId) => push({ name: "product", productId })}
						onOpenHold={(holdId) => push({ name: "hold", holdId })}
						onChanged={() => void reload()}
					/>
				)}

				{token && current.name === "tab" && current.tab === "settings" && (
					<SettingsScreen
						accessToken={token}
						via={session.kind === "user" ? session.via : "dev"}
						onSignOut={signOut}
					/>
				)}

				{token && current.name === "inbox" && (
					<InboxScreen accessToken={token} onUnreadChange={setUnread} />
				)}

				{token && store && current.name === "productRegister" && (
					<ProductRegisterScreen
						accessToken={token}
						businessCloseTime={store.businessCloseTime}
						onRegistered={(product) => {
							void reload();
							setStack([{ name: "tab", tab: "home" }, { name: "product", productId: product.id }]);
						}}
						onCancel={back}
					/>
				)}

				{token && current.name === "product" && (
					<ProductDetailScreen
						productId={current.productId}
						accessToken={token}
						onSaved={() => void reload()}
					/>
				)}

				{token && current.name === "hold" && (
					<OwnerHoldDetailScreen
						holdId={current.holdId}
						accessToken={token}
						onChanged={() => void reload()}
					/>
				)}
			</div>

			<nav className="app-tabs">
				{TABS.map((item) => (
					<button
						key={item.tab}
						type="button"
						className={
							activeTab === item.tab && current.name === "tab"
								? "app-tabs__tab app-tabs__tab--on"
								: "app-tabs__tab"
						}
						onClick={() => setStack([{ name: "tab", tab: item.tab }])}
					>
						{item.label}
					</button>
				))}
			</nav>
		</div>
	);
}
