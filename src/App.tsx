import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { PasswordPage } from "./pages/PasswordPage";
import { RecipeDetailPage } from "./pages/RecipeDetailPage";
import { RecipeListPage } from "./pages/RecipeListPage";
import { ShortsPage } from "./pages/ShortsPage";
import { StoreListPage } from "./pages/StoreListPage";
import { UserListPage } from "./pages/UserListPage";

function RequireAuth({ children }: { children: ReactNode }) {
	const { authenticated } = useAuth();
	return authenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
	const { authenticated } = useAuth();
	return authenticated ? <Navigate to="/recipes" replace /> : <>{children}</>;
}

export default function App() {
	return (
		<AuthProvider>
			<BrowserRouter>
				<Routes>
					<Route
						path="/login"
						element={
							<RedirectIfAuthenticated>
								<LoginPage />
							</RedirectIfAuthenticated>
						}
					/>
					<Route
						element={
							<RequireAuth>
								<Layout />
							</RequireAuth>
						}
					>
						<Route path="/recipes" element={<RecipeListPage />} />
						<Route path="/recipes/:id" element={<RecipeDetailPage />} />
						<Route path="/users" element={<UserListPage />} />
						<Route path="/stores" element={<StoreListPage />} />
						<Route path="/shorts" element={<ShortsPage />} />
						<Route path="/password" element={<PasswordPage />} />
					</Route>
					<Route path="*" element={<Navigate to="/recipes" replace />} />
				</Routes>
			</BrowserRouter>
		</AuthProvider>
	);
}
