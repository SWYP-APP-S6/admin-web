import { useEffect, useMemo, useState } from "react";
import { issueTestToken } from "../api/devToken";
import { exchangeKakaoCode, loginWithKakao, signupWithKakao } from "../api/kakaoAuth";
import { ErrorNote, asError } from "../app/shared";
import type { OwnerSession } from "./session";

const REDIRECT_PATH = "/owner";
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_OWNER_JS_KEY;

type Step = { kind: "idle" } | { kind: "exchanging" } | { kind: "terms"; signupToken: string };

/**
 * O-001 로그인 · O-002 약관 동의. 점주 앱은 소비자 앱과 **다른 카카오 앱**이라 JS 키도 따로다 --
 * 서버가 access_token_info 로 app_id 를 확인하므로 소비자 앱 키로 받은 토큰은 여기서 거부된다.
 */
export function LoginScreen({ onSignedIn }: { onSignedIn: (session: OwnerSession) => void }) {
	const [step, setStep] = useState<Step>({ kind: "idle" });
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [terms, setTerms] = useState({
		service: false,
		privacy: false,
		location: false,
		thirdParty: false,
		marketing: false,
	});

	const redirectUri = useMemo(() => `${window.location.origin}${REDIRECT_PATH}`, []);
	const requiredAgreed = terms.service && terms.privacy && terms.location && terms.thirdParty;
	const allAgreed = requiredAgreed && terms.marketing;

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");
		const failure = params.get("error");
		if (!code && !failure) {
			return;
		}
		window.history.replaceState(null, "", REDIRECT_PATH);
		if (failure) {
			setError(new Error(`카카오 로그인이 취소되었습니다 (${failure}).`));
			return;
		}
		void exchange(code as string);
		// 카카오에서 돌아온 직후 한 번만 실행한다.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function exchange(code: string) {
		setStep({ kind: "exchanging" });
		setError(null);
		try {
			const { kakaoAccessToken } = await exchangeKakaoCode("OWNER", code, redirectUri);
			const result = await loginWithKakao("OWNER", kakaoAccessToken);
			if (result.registered) {
				onSignedIn({
					kind: "user",
					accessToken: result.accessToken as string,
					refreshToken: result.refreshToken,
					via: "kakao",
				});
				return;
			}
			setStep({ kind: "terms", signupToken: result.signupToken as string });
		} catch (caught) {
			setStep({ kind: "idle" });
			setError(asError(caught));
		}
	}

	function startKakao() {
		setError(null);
		if (!KAKAO_JS_KEY) {
			setError(
				new Error("점주 앱의 카카오 JS 키가 없습니다 (admin-web .env.local 의 VITE_KAKAO_OWNER_JS_KEY)."),
			);
			return;
		}
		if (!window.Kakao) {
			setError(new Error("카카오 SDK를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요."));
			return;
		}
		if (window.Kakao.isInitialized()) {
			window.Kakao.cleanup();
		}
		window.Kakao.init(KAKAO_JS_KEY);
		window.Kakao.Auth.authorize({ redirectUri, scope: "profile_nickname" });
	}

	async function run(label: string, work: () => Promise<OwnerSession>) {
		setBusy(label);
		setError(null);
		try {
			onSignedIn(await work());
		} catch (caught) {
			setError(asError(caught));
		} finally {
			setBusy(null);
		}
	}

	if (step.kind === "terms") {
		return (
			<div className="app-screen">
				<h2 className="app-title">
					서비스 이용을 위한
					<br />
					약관 동의가 필요해요 📝
				</h2>
				<p className="app-sub">동의하면 계정이 만들어집니다. 여기서 나가면 아무것도 남지 않습니다.</p>

				<div className="app-terms">
					<label className="checkbox-field owner-terms__all">
						<input
							type="checkbox"
							checked={allAgreed}
							onChange={(event) =>
								setTerms({
									service: event.target.checked,
									privacy: event.target.checked,
									location: event.target.checked,
									thirdParty: event.target.checked,
									marketing: event.target.checked,
								})
							}
						/>
						전체동의
					</label>
					{[
						["service", "[필수] 맹그로 사장님 서비스 이용 약관"],
						["privacy", "[필수] 개인정보 수집 · 이용 동의"],
						["location", "[필수] 위치기반 서비스 이용약관 동의"],
						["thirdParty", "[필수] 개인정보 제3자 제공 동의"],
						["marketing", "[선택] 마케팅 정보 수신 동의"],
					].map(([key, label]) => (
						<label className="checkbox-field" key={key}>
							<input
								type="checkbox"
								checked={terms[key as keyof typeof terms]}
								onChange={(event) =>
									setTerms((current) => ({ ...current, [key]: event.target.checked }))
								}
							/>
							{label}
						</label>
					))}
				</div>

				{error && <ErrorNote error={error} />}

				<button
					className="phone__cta"
					type="button"
					disabled={!requiredAgreed || busy !== null}
					onClick={() =>
						run("signup", async () => {
							const tokens = await signupWithKakao({
								signupToken: step.signupToken,
								serviceTermsAgreed: terms.service,
								privacyTermsAgreed: terms.privacy,
								locationTermsAgreed: terms.location,
								thirdPartyTermsAgreed: terms.thirdParty,
								marketingOptIn: terms.marketing,
							});
							return {
								kind: "user",
								accessToken: tokens.accessToken,
								refreshToken: tokens.refreshToken,
								via: "kakao",
							};
						})
					}
				>
					{busy === "signup" ? "가입 중…" : "다음"}
				</button>
			</div>
		);
	}

	return (
		<div className="app-screen app-screen--center">
			<h2 className="owner-hello">
				사장님! 👋
				<br />
				오늘 팔고 남은 🥦 식자재
				<br />
				여기서 파세요
			</h2>

			{step.kind === "exchanging" && <p className="state">카카오 계정을 확인하는 중…</p>}
			{error && <ErrorNote error={error} />}

			<button className="phone__cta app-cta--kakao" type="button" onClick={startKakao}>
				카카오로 시작하기
			</button>

			<div className="app-divider">개발용</div>
			<button
				className="phone__cta phone__cta--ghost"
				type="button"
				disabled={busy !== null}
				onClick={() =>
					run("dev", async () => ({
						kind: "user",
						accessToken: (await issueTestToken("OWNER")).accessToken,
						refreshToken: null,
						via: "dev",
					}))
				}
			>
				{busy === "dev" ? "발급 중…" : "테스트 점주 계정으로 시작"}
			</button>
			<p className="app-hint">
				카카오 왕복 없이 <code>POST /dev/test-token?role=OWNER</code> 으로 토큰만 받습니다(이
				엔드포인트는 <strong>관리자 토큰</strong>을 요구하므로 이 페이지에 로그인해 있어야
				합니다). 계정은 <code>(dev, test-owner)</code> 한 건을 재사용하므로, 한 번 가게를
				등록해두면 계속 그 가게로 들어옵니다.
			</p>
		</div>
	);
}
