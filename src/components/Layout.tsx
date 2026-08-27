import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout() {
	const { signOut } = useAuth();
	const navigate = useNavigate();

	async function handleSignOut() {
		await signOut();
		navigate("/login", { replace: true });
	}

	return (
		<div className="layout">
			<header className="layout__header">
				<span className="layout__brand">프레실리 관리자</span>
				<nav className="layout__nav">
					<NavLink
						to="/recipes"
						className={({ isActive }) => (isActive ? "layout__link layout__link--active" : "layout__link")}
					>
						레시피
					</NavLink>
					<NavLink
						to="/password"
						className={({ isActive }) => (isActive ? "layout__link layout__link--active" : "layout__link")}
					>
						비밀번호 변경
					</NavLink>
				</nav>
				<button className="button" type="button" onClick={handleSignOut}>
					로그아웃
				</button>
			</header>
			<main className="layout__main">
				<Outlet />
			</main>
		</div>
	);
}
