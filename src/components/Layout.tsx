import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const NAV_ITEMS = [
	{ to: "/recipes", label: "레시피" },
	{ to: "/users", label: "유저" },
	{ to: "/stores", label: "가게" },
	{ to: "/kakao-test", label: "카카오 로그인 테스트" },
];

function navClass({ isActive }: { isActive: boolean }) {
	return isActive ? "nav__link nav__link--active" : "nav__link";
}

export function Layout() {
	const { signOut } = useAuth();
	const navigate = useNavigate();

	async function handleSignOut() {
		await signOut();
		navigate("/login", { replace: true });
	}

	return (
		<div className="layout">
			<aside className="sidebar">
				<div className="sidebar__brand">프레실리 관리자</div>

				<nav className="nav">
					{NAV_ITEMS.map((item) => (
						<NavLink key={item.to} to={item.to} className={navClass}>
							{item.label}
						</NavLink>
					))}
				</nav>

				<div className="sidebar__footer">
					<NavLink to="/password" className={navClass}>
						비밀번호 변경
					</NavLink>
					<button className="nav__link nav__link--button" type="button" onClick={handleSignOut}>
						로그아웃
					</button>
				</div>
			</aside>

			<main className="content">
				<Outlet />
			</main>
		</div>
	);
}
