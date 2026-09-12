import { useEffect, useMemo, useState } from "react";
import { issueGuestToken } from "../api/consumerAuth";
import { issueTestToken } from "../api/devToken";
import { exchangeKakaoCode, loginWithKakao, signupWithKakao } from "../api/kakaoAuth";
import { ErrorNote, asError } from "./shared";
import { installId } from "./session";
import type { Session } from "./session";

const REDIRECT_PATH = "/app";
const PENDING_KEY = "swyp.consumer.kakaoPending";
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_CONSUMER_JS_KEY;

type Step =
	| { kind: "idle" }
	| { kind: "exchanging" }
	| { kind: "terms"; signupToken: string };

/**
 * C-001 로그인 · C-002 약관 동의. 가입은 서버에서 2단계다 -- 첫 카카오 로그인은 users 행을
 * 만들지 않고 단기 signupToken 만 주고, 약관 동의가 계정을 만든다. 그래서 약관 화면에서
 * 이탈하면 아무것도 남지 않는다.
 */
export function LoginScreen({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
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

	// Kakao.Auth.authorize() 는 전체 페이지 리다이렉트라 컴포넌트 상태가 날아간다. 돌아왔을 때
	// 쿼리에 code 가 있으면 이어서 교환한다.
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");
		const failure = params.get("error");
		if (!code && !failure) {
			return;
		}
		window.history.replaceState(null, "", REDIRECT_PATH);
		sessionStorage.removeItem(PENDING_KEY);
		if (failure) {
			setError(new Error(`카카오 로그인이 취소되었습니다 (${failure}).`));
			return;
		}
		void exchange(code as string);
		// 복귀 시 한 번만 실행한다.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function exchange(code: string) {
		setStep({ kind: "exchanging" });
		setError(null);
		try {
			const { kakaoAccessToken } = await exchangeKakaoCode("CONSUMER", code, redirectUri);
			const result = await loginWithKakao("CONSUMER", kakaoAccessToken);
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
			setError(new Error("카카오 JS 키가 없습니다 (admin-web .env.local 의 VITE_KAKAO_CONSUMER_JS_KEY)."));
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
		sessionStorage.setItem(PENDING_KEY, "1");
		window.Kakao.Auth.authorize({ redirectUri, scope: "profile_nickname" });
	}

	async function run(label: string, work: () => Promise<Session>) {
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
			<div className="app-screen app-screen--center">
				<h2 className="app-title">약관에 동의해주세요</h2>
				<p className="app-sub">
					동의하면 계정이 만들어집니다. 여기서 나가면 아무것도 남지 않습니다.
				</p>

				<div className="app-terms">
					{[
						["service", "(필수) 서비스 이용약관 동의"],
						["privacy", "(필수) 개인정보 수집·이용 동의"],
						["location", "(필수) 위치기반 서비스 이용약관 동의"],
						["thirdParty", "(필수) 개인정보 제3자 제공 동의"],
						["marketing", "(선택) 마케팅 정보 수신 동의"],
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
					{busy === "signup" ? "가입 중…" : "확인하기"}
				</button>
			</div>
		);
	}

	return (
		<div className="app-screen app-screen--center">
			<div className="app-brand">프레실리</div>
			<p className="app-sub">
				동네 가게의 마감 임박 상품을 15분간 찜하고 걸어가서 받아요.
			</p>

			{step.kind === "exchanging" && <p className="state">카카오 계정을 확인하는 중…</p>}
			{error && <ErrorNote error={error} />}

			<button className="phone__cta app-cta--kakao" type="button" onClick={startKakao}>
				카카오로 시작하기
			</button>

			<button
				className="phone__cta phone__cta--ghost"
				type="button"
				disabled={busy !== null}
				onClick={() =>
					run("guest", async () => ({
						kind: "guest",
						accessToken: (await issueGuestToken(installId())).accessToken,
					}))
				}
			>
				{busy === "guest" ? "여는 중…" : "로그인 없이 둘러보기"}
			</button>

			<div className="app-divider">개발용</div>
			<button
				className="phone__cta phone__cta--ghost"
				type="button"
				disabled={busy !== null}
				onClick={() =>
					run("dev", async () => ({
						kind: "user",
						accessToken: (await issueTestToken("CONSUMER")).accessToken,
						refreshToken: null,
						via: "dev",
					}))
				}
			>
				{busy === "dev" ? "발급 중…" : "테스트 소비자 계정으로 시작"}
			</button>
			<p className="app-hint">
				카카오 왕복 없이 <code>POST /dev/test-token</code> 으로 토큰만 받습니다. 운영
				프로파일에서는 이 엔드포인트의 빈 자체가 만들어지지 않습니다.
			</p>
		</div>
	);
}
