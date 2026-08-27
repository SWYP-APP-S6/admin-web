import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
	const { signIn } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await signIn(email, password);
			navigate("/recipes", { replace: true });
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "로그인에 실패했습니다.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="login">
			<form className="login__card" onSubmit={handleSubmit}>
				<h1 className="login__title">프레실리 관리자</h1>

				<label className="field">
					<span className="field__label">이메일</span>
					<input
						className="field__input"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						autoComplete="username"
						required
					/>
				</label>

				<label className="field">
					<span className="field__label">비밀번호</span>
					<input
						className="field__input"
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						autoComplete="current-password"
						required
					/>
				</label>

				{error && <p className="login__error">{error}</p>}

				<button className="button button--primary" type="submit" disabled={submitting}>
					{submitting ? "로그인 중…" : "로그인"}
				</button>
			</form>
		</div>
	);
}
