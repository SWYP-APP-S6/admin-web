import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { login as loginRequest, logout as logoutRequest } from "../api/auth";
import { getAccessToken } from "./tokens";

interface AuthValue {
	authenticated: boolean;
	signIn: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [authenticated, setAuthenticated] = useState(() => getAccessToken() !== null);

	const signIn = useCallback(async (email: string, password: string) => {
		await loginRequest(email, password);
		setAuthenticated(true);
	}, []);

	const signOut = useCallback(async () => {
		await logoutRequest();
		setAuthenticated(false);
	}, []);

	const value = useMemo(
		() => ({ authenticated, signIn, signOut }),
		[authenticated, signIn, signOut],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
	const value = useContext(AuthContext);
	if (!value) {
		throw new Error("useAuth must be used inside AuthProvider");
	}
	return value;
}
