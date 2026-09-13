import { useCallback, useEffect, useState } from "react";
import { setOverrideTokenRenewal } from "../api/client";
import { issueGuestToken, logoutAppUser, refreshAppUser } from "../api/consumerAuth";
import { fetchActiveHold } from "../api/holds";
import { HistoryScreen } from "../consumer/HistoryScreen";
import { HoldScreen } from "../consumer/HoldScreen";
import { HomeScreen, POSITIONS } from "../consumer/HomeScreen";
import type { Position } from "../consumer/HomeScreen";
import { InboxScreen } from "../consumer/InboxScreen";
import { LoginScreen } from "../consumer/LoginScreen";
import { MyScreen } from "../consumer/MyScreen";
import { ProductScreen } from "../consumer/ProductScreen";
import { installId, loadSession, saveSession } from "../consumer/session";
import type { Session } from "../consumer/session";
import { clockLabel, won } from "../consumer/shared";
import type { ActiveHoldResponse } from "../types";

type Tab = "home" | "history" | "inbox" | "my";

type Route =
	| { name: "tab"; tab: Tab }
	| { name: "product"; productId: number }
	| { name: "hold"; holdId: number };

const TABS: { tab: Tab; label: string }[] = [
	{ tab: "home", label: "홈" },
	{ tab: "history", label: "찜 내역" },
	{ tab: "inbox", label: "알림" },
	{ tab: "my", label: "마이" },
];

const TITLE: Record<Tab, string> = {
	home: "홈",
	history: "찜 내역",
	inbox: "알림",
	my: "마이",
};

export function ConsumerAppPage() {
	const [session, setSession] = useState<Session>(() => loadSession());
	const [stack, setStack] = useState<Route[]>([{ name: "tab", tab: "home" }]);
	const [position, setPosition] = useState<Position>(POSITIONS[0]);
	const [active, setActive] = useState<ActiveHoldResponse | null>(null);
	const [unread, setUnread] = useState(0);
	const [holdsChanged, setHoldsChanged] = useState(0);
	const [loginNotice, setLoginNotice] = useState(false);
	const [expired, setExpired] = useState(false);
	const [tick, setTick] = useState(() => Date.now());

	const signedIn = session.kind === "user";
	const token = session.kind === "none" ? null : session.accessToken;
	const current = stack[stack.length - 1];
	const tab = [...stack].reverse().find((route) => route.name === "tab");
	const activeTab: Tab = tab && tab.name === "tab" ? tab.tab : "home";

	// access 토큰이 만료되면(jwt.access-ttl=30m) 앱은 조용히 한 번 되살리고, 안 되면 로그인
	// 화면으로 보낸다. 이게 없으면 화면마다 UNAUTHORIZED 만 뜨고 로그아웃 버튼조차 못 눌러
	// 빠져나올 길이 없다 -- 회원은 refresh 로, 비회원은 같은 installId 로 다시 발급받는다.
	useEffect(() => {
		setOverrideTokenRenewal(async () => {
			const stored = loadSession();
			try {
				if (stored.kind === "guest") {
					const issued = await issueGuestToken(installId());
					const next: Session = { kind: "guest", accessToken: issued.accessToken };
					saveSession(next);
					setSession(next);
					return issued.accessToken;
				}
				if (stored.kind === "user" && stored.refreshToken) {
					const tokens = await refreshAppUser(stored.refreshToken);
					const next: Session = { ...stored, ...tokens };
					saveSession(next);
					setSession(next);
					return tokens.accessToken;
				}
			} catch {
				// 갱신 실패는 곧 세션 종료다. 아래에서 로그인 화면으로 보낸다.
			}
			saveSession({ kind: "none" });
			setSession({ kind: "none" });
			setExpired(true);
			return null;
		});
		return () => setOverrideTokenRenewal(null);
	}, []);

	// 홈 상단 배너(C-010-06)와 마이의 취소권이 같은 응답을 쓴다. 찜이 바뀔 때만 다시 부른다.
	const reloadActive = useCallback(() => {
		if (!signedIn || !token) {
			setActive(null);
			return;
		}
		fetchActiveHold(token)
			.then(setActive)
			.catch(() => setActive(null));
	}, [signedIn, token]);

	useEffect(reloadActive, [reloadActive, holdsChanged]);

	useEffect(() => {
		const timer = window.setInterval(() => setTick(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	function apply(next: Session) {
		saveSession(next);
		setSession(next);
		setStack([{ name: "tab", tab: "home" }]);
		setLoginNotice(false);
		setExpired(false);
	}

	async function signOut() {
		if (session.kind === "user" && session.refreshToken) {
			// 서버 폐기가 실패해도 로컬 세션은 반드시 끝낸다. 남겨두면 로그아웃한 줄 알고 자리를 뜬다.
			await logoutAppUser(session.refreshToken).catch(() => undefined);
		}
		apply({ kind: "none" });
	}

	function push(route: Route) {
		setStack((current) => [...current, route]);
	}

	function goTab(next: Tab) {
		if (next !== "home" && !signedIn) {
			setLoginNotice(true);
			return;
		}
		setLoginNotice(false);
		setStack([{ name: "tab", tab: next }]);
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

	const banner = active?.hold ?? null;
	const remaining = banner ? new Date(banner.expiresAt).getTime() - tick : 0;

	return (
		<div className="app-frame">
			<header className="app-bar">
				{stack.length > 1 ? (
					<button
						className="app-bar__back"
						type="button"
						onClick={() => setStack((current) => current.slice(0, -1))}
					>
						←
					</button>
				) : (
					<span className="app-bar__back" />
				)}
				<span className="app-bar__title">
					{current.name === "tab"
						? TITLE[current.tab]
						: current.name === "product"
							? "상품"
							: "찜 현황"}
				</span>
				<span className="app-bar__realm">
					{session.kind === "guest" ? "비회원" : session.via === "dev" ? "테스트" : "카카오"}
				</span>
			</header>

			<div className="app-body">
				{loginNotice && (
					<div className="app-login-gate">
						<p>
							이 기능은 로그인이 필요합니다. 서버는 비회원 토큰에{" "}
							<code>403 LOGIN_REQUIRED</code> 를 돌려줍니다.
						</p>
						<button className="phone__cta" type="button" onClick={() => apply({ kind: "none" })}>
							로그인하러 가기
						</button>
					</div>
				)}

				{!loginNotice && banner && current.name === "tab" && current.tab === "home" && (
					<button
						className="app-banner"
						type="button"
						onClick={() => push({ name: "hold", holdId: banner.id })}
					>
						<span>
							<strong>{banner.store.name}</strong> {banner.totalQty}개 · {won(banner.totalPrice)}
						</span>
						<span className="app-banner__clock">{clockLabel(remaining)}</span>
					</button>
				)}

				{!loginNotice && current.name === "tab" && current.tab === "home" && (
					<HomeScreen
						position={position}
						accessToken={token as string}
						onChangePosition={setPosition}
						onOpenProduct={(productId) => push({ name: "product", productId })}
					/>
				)}

				{!loginNotice && current.name === "tab" && current.tab === "history" && token && (
					<HistoryScreen
						accessToken={token}
						reloadKey={holdsChanged}
						onOpenHold={(holdId) => push({ name: "hold", holdId })}
					/>
				)}

				{!loginNotice && current.name === "tab" && current.tab === "inbox" && token && (
					<InboxScreen accessToken={token} onUnreadChange={setUnread} />
				)}

				{!loginNotice && current.name === "tab" && current.tab === "my" && token && signedIn && (
					<MyScreen
						accessToken={token}
						reloadKey={holdsChanged}
						via={session.kind === "user" ? session.via : "dev"}
						onSignOut={signOut}
					/>
				)}

				{current.name === "product" && token && (
					<ProductScreen
						productId={current.productId}
						position={position}
						accessToken={token}
						canHold={signedIn}
						onRequireLogin={() => setLoginNotice(true)}
						onHeld={(hold) => {
							setHoldsChanged((count) => count + 1);
							setStack([{ name: "tab", tab: "home" }, { name: "hold", holdId: hold.id }]);
						}}
						onOpenHold={(holdId) => push({ name: "hold", holdId })}
					/>
				)}

				{current.name === "hold" && token && (
					<HoldScreen
						holdId={current.holdId}
						accessToken={token}
						onChanged={() => setHoldsChanged((count) => count + 1)}
						onBrowse={() => setStack([{ name: "tab", tab: "home" }])}
					/>
				)}
			</div>

			<nav className="app-tabs">
				{TABS.map((item) => (
					<button
						key={item.tab}
						type="button"
						className={
							activeTab === item.tab && !loginNotice
								? "app-tabs__tab app-tabs__tab--on"
								: "app-tabs__tab"
						}
						onClick={() => goTab(item.tab)}
					>
						{item.label}
						{item.tab === "inbox" && unread > 0 && <span className="app-tabs__dot" />}
					</button>
				))}
			</nav>
		</div>
	);
}
