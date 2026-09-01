import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { exchangeKakaoCode, loginWithKakao, signupWithKakao } from "../api/kakaoAuth";
import type { UserRole } from "../types";

const ROLE_STORAGE_KEY = "swyp.kakaoTest.role";
const REDIRECT_PATH = "/kakao-test";
const ROLES: UserRole[] = ["CONSUMER", "OWNER"];
const ROLE_LABEL: Record<UserRole, string> = { CONSUMER: "소비자", OWNER: "점주" };
const KAKAO_JS_KEYS: Record<UserRole, string | undefined> = {
	CONSUMER: import.meta.env.VITE_KAKAO_CONSUMER_JS_KEY,
	OWNER: import.meta.env.VITE_KAKAO_OWNER_JS_KEY,
};

type Step =
	| { kind: "idle" }
	| { kind: "exchanging" }
	| { kind: "signupRequired"; role: UserRole; signupToken: string }
	| { kind: "loggedIn"; role: UserRole; accessToken: string; refreshToken: string }
	| { kind: "error"; message: string };

export function KakaoTestPage() {
	const [role, setRole] = useState<UserRole>("CONSUMER");
	const [step, setStep] = useState<Step>({ kind: "idle" });
	const [serviceTermsAgreed, setServiceTermsAgreed] = useState(false);
	const [privacyTermsAgreed, setPrivacyTermsAgreed] = useState(false);
	const [locationTermsAgreed, setLocationTermsAgreed] = useState(false);
	const [marketingOptIn, setMarketingOptIn] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	// Kakao.Auth.authorize() 는 전체 페이지 리다이렉트라 컴포넌트 상태가 날아간다 — 어떤
	// role 로 시작했는지만 세션스토리지에 남겨 돌아왔을 때 이어서 처리한다.
	const redirectUri = useMemo(() => `${window.location.origin}${REDIRECT_PATH}`, []);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");
		const errorParam = params.get("error");
		if (!code && !errorParam) {
			return;
		}
		window.history.replaceState(null, "", REDIRECT_PATH);

		if (errorParam) {
			setStep({ kind: "error", message: `카카오 로그인이 취소되었습니다 (${errorParam}).` });
			return;
		}

		const storedRole = sessionStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
		if (!storedRole) {
			setStep({ kind: "error", message: "테스트 세션 정보가 없습니다. 처음부터 다시 시도해주세요." });
			return;
		}
		setRole(storedRole);
		void runExchange(storedRole, code as string);
		// 리다이렉트 복귀 시 한 번만 실행한다.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function runExchange(targetRole: UserRole, code: string) {
		setStep({ kind: "exchanging" });
		try {
			const { kakaoAccessToken } = await exchangeKakaoCode(targetRole, code, redirectUri);
			const result = await loginWithKakao(targetRole, kakaoAccessToken);
			if (result.registered) {
				setStep({
					kind: "loggedIn",
					role: targetRole,
					accessToken: result.accessToken as string,
					refreshToken: result.refreshToken as string,
				});
			} else {
				setStep({ kind: "signupRequired", role: targetRole, signupToken: result.signupToken as string });
			}
		} catch (caught) {
			setStep({ kind: "error", message: caught instanceof Error ? caught.message : "로그인에 실패했습니다." });
		}
	}

	function startKakaoLogin() {
		const jsKey = KAKAO_JS_KEYS[role];
		if (!jsKey) {
			setStep({
				kind: "error",
				message: `${ROLE_LABEL[role]} 앱의 카카오 JS 키가 설정되어 있지 않습니다 (admin-web .env.local).`,
			});
			return;
		}
		if (!window.Kakao) {
			setStep({ kind: "error", message: "카카오 SDK를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요." });
			return;
		}
		if (window.Kakao.isInitialized()) {
			window.Kakao.cleanup();
		}
		window.Kakao.init(jsKey);
		sessionStorage.setItem(ROLE_STORAGE_KEY, role);
		window.Kakao.Auth.authorize({ redirectUri, scope: "profile_nickname" });
	}

	async function handleSignup(event: FormEvent) {
		event.preventDefault();
		if (step.kind !== "signupRequired") {
			return;
		}
		setSubmitting(true);
		try {
			const tokens = await signupWithKakao({
				signupToken: step.signupToken,
				serviceTermsAgreed,
				privacyTermsAgreed,
				locationTermsAgreed,
				marketingOptIn,
			});
			setStep({
				kind: "loggedIn",
				role: step.role,
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
			});
		} catch (caught) {
			setStep({ kind: "error", message: caught instanceof Error ? caught.message : "회원가입에 실패했습니다." });
		} finally {
			setSubmitting(false);
		}
	}

	function reset() {
		sessionStorage.removeItem(ROLE_STORAGE_KEY);
		setServiceTermsAgreed(false);
		setPrivacyTermsAgreed(false);
		setLocationTermsAgreed(false);
		setMarketingOptIn(false);
		setStep({ kind: "idle" });
	}

	return (
		<section className="narrow">
			<div className="page-head">
				<h1 className="page-title">카카오 로그인 테스트</h1>
			</div>

			<p className="notice">
				유저 관점에서 카카오 회원가입/로그인 흐름을 확인하는 내부 테스트 페이지입니다.
			</p>

			{step.kind === "idle" && (
				<div className="form-card">
					<div className="role-toggle" role="radiogroup" aria-label="역할 선택">
						{ROLES.map((candidate) => (
							<button
								key={candidate}
								type="button"
								className={role === candidate ? "chip chip--active" : "chip"}
								onClick={() => setRole(candidate)}
							>
								{ROLE_LABEL[candidate]}
							</button>
						))}
					</div>

					{!KAKAO_JS_KEYS[role] && (
						<p className="form-message form-message--error">
							{ROLE_LABEL[role]} 앱의 JS 키가 설정되어 있지 않습니다 (VITE_KAKAO_{role}_JS_KEY).
						</p>
					)}

					<button
						className="button button--primary"
						type="button"
						onClick={startKakaoLogin}
						disabled={!KAKAO_JS_KEYS[role]}
					>
						카카오로 {ROLE_LABEL[role]} 로그인/회원가입
					</button>
				</div>
			)}

			{step.kind === "exchanging" && (
				<div className="form-card">
					<p className="form-message">카카오 인증 확인 중…</p>
				</div>
			)}

			{step.kind === "signupRequired" && (
				<form onSubmit={handleSignup} className="form-card">
					<p className="form-message">
						{ROLE_LABEL[step.role]}으로 첫 로그인입니다. 약관에 동의하면 계정이 생성됩니다.
					</p>

					<label className="checkbox-field">
						<input
							type="checkbox"
							checked={serviceTermsAgreed}
							onChange={(event) => setServiceTermsAgreed(event.target.checked)}
						/>
						(필수) 서비스 이용약관 동의
					</label>
					<label className="checkbox-field">
						<input
							type="checkbox"
							checked={privacyTermsAgreed}
							onChange={(event) => setPrivacyTermsAgreed(event.target.checked)}
						/>
						(필수) 개인정보 수집·이용 동의
					</label>
					<label className="checkbox-field">
						<input
							type="checkbox"
							checked={locationTermsAgreed}
							onChange={(event) => setLocationTermsAgreed(event.target.checked)}
						/>
						(필수) 위치기반 서비스 이용약관 동의
					</label>
					<label className="checkbox-field">
						<input
							type="checkbox"
							checked={marketingOptIn}
							onChange={(event) => setMarketingOptIn(event.target.checked)}
						/>
						(선택) 마케팅 정보 수신 동의
					</label>

					<button
						className="button button--primary"
						type="submit"
						disabled={submitting || !serviceTermsAgreed || !privacyTermsAgreed || !locationTermsAgreed}
					>
						{submitting ? "가입 중…" : "가입 완료"}
					</button>
				</form>
			)}

			{step.kind === "loggedIn" && (
				<div className="form-card">
					<p className="form-message form-message--success">{ROLE_LABEL[step.role]} 로그인 성공.</p>
					<pre className="token-box">{`accessToken:\n${step.accessToken}\n\nrefreshToken:\n${step.refreshToken}`}</pre>
					<button className="button button--primary" type="button" onClick={reset}>
						다시 테스트
					</button>
				</div>
			)}

			{step.kind === "error" && (
				<div className="form-card">
					<p className="form-message form-message--error">{step.message}</p>
					<button className="button button--primary" type="button" onClick={reset}>
						다시 시도
					</button>
				</div>
			)}
		</section>
	);
}
