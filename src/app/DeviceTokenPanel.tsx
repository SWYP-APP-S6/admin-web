import { useState } from "react";
import { registerDeviceToken, unregisterDeviceToken } from "../api/notifications";
import { ErrorNote, asError } from "./shared";
import type { DevicePlatform } from "../types";

const PLATFORMS: DevicePlatform[] = ["ANDROID", "IOS"];

/**
 * 푸시 수신처 등록·해제(`/notifications/device-tokens`). 브라우저에는 FCM 토큰이 없으므로 임의
 * 문자열로 **계약만** 확인한다 -- 실제 발송은 아웃박스 배치가 맡고, 여기서 확인되는 것은 행이
 * 생기고 지워지는지까지다. 소비자·점주 어느 쪽 세션에서도 같은 엔드포인트를 쓴다(REALM_USER).
 */
export function DeviceTokenPanel({ accessToken }: { accessToken: string }) {
	const [platform, setPlatform] = useState<DevicePlatform>("ANDROID");
	const [token, setToken] = useState(() => `admin-web-${crypto.randomUUID()}`);
	const [done, setDone] = useState<string | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [busy, setBusy] = useState(false);

	async function run(label: string, work: () => Promise<void>) {
		setBusy(true);
		setError(null);
		setDone(null);
		try {
			await work();
			setDone(label);
		} catch (caught) {
			setError(asError(caught));
		} finally {
			setBusy(false);
		}
	}

	return (
		<section className="app-store">
			<header className="app-store__head">
				<strong>기기 토큰 (FCM)</strong>
			</header>
			<p className="app-hint">
				앱은 로그인 직후 등록하고 <strong>로그아웃 때 지웁니다</strong> — 지우지 않으면 그 기기를
				이어 쓰는 다음 사람이 남의 푸시를 받습니다. 브라우저에는 진짜 FCM 토큰이 없어 임의
				문자열로 등록·해제만 확인합니다.
			</p>

			<div className="filters">
				{PLATFORMS.map((item) => (
					<button
						key={item}
						type="button"
						className={item === platform ? "chip chip--active" : "chip"}
						onClick={() => setPlatform(item)}
					>
						{item}
					</button>
				))}
			</div>

			<input
				className="field__input"
				value={token}
				maxLength={255}
				onChange={(event) => setToken(event.target.value)}
			/>

			{error && <ErrorNote error={error} />}
			{done && <p className="state">{done}</p>}

			<div className="owner-sheet__actions" style={{ marginTop: 8 }}>
				<button
					className="phone__cta phone__cta--ghost"
					type="button"
					disabled={busy || token.trim() === ""}
					onClick={() => run("등록했습니다.", () => registerDeviceToken(platform, token, accessToken))}
				>
					등록
				</button>
				<button
					className="phone__cta phone__cta--ghost"
					type="button"
					disabled={busy || token.trim() === ""}
					onClick={() => run("해제했습니다.", () => unregisterDeviceToken(token, accessToken))}
				>
					해제
				</button>
			</div>
		</section>
	);
}
