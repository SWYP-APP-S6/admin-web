import { useEffect, useState } from "react";
import { fetchMe } from "../api/me";
import { fetchMyStore } from "../api/owner";
import { DeviceTokenPanel } from "../app/DeviceTokenPanel";
import { ErrorNote, Loading, asError, momentLabel } from "../app/shared";
import { DAY_CHIPS, STORE_CATEGORY_LABEL, STORE_STATUS_LABEL } from "./session";
import type { Me, StoreDetail } from "../types";

interface Props {
	accessToken: string;
	via: "kakao" | "dev";
	onSignOut: () => void;
}

/** 설정 탭. 피그마에 화면이 없어 서버가 주는 것(계정 · 가게)을 그대로 펼쳐 둔다. */
export function SettingsScreen({ accessToken, via, onSignOut }: Props) {
	const [me, setMe] = useState<Me | null>(null);
	const [store, setStore] = useState<StoreDetail | null>(null);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		let active = true;
		Promise.all([fetchMe(accessToken), fetchMyStore(accessToken)])
			.then(([loadedMe, loadedStore]) => {
				if (active) {
					setMe(loadedMe);
					setStore(loadedStore);
				}
			})
			.catch((caught) => {
				if (active) {
					setError(asError(caught));
				}
			});
		return () => {
			active = false;
		};
	}, [accessToken]);

	if (error) {
		return <ErrorNote error={error} />;
	}
	if (!me || !store) {
		return <Loading />;
	}

	return (
		<div className="app-screen">
			<h3 className="owner-section">계정</h3>
			<dl className="kv">
				<dt>닉네임</dt>
				<dd>{me.nickname}</dd>
				<dt>역할</dt>
				<dd>{me.role}</dd>
				<dt>가입</dt>
				<dd>{momentLabel(me.joinedAt)}</dd>
				<dt>로그인 방식</dt>
				<dd>{via === "dev" ? "테스트 토큰 (/dev/test-token)" : "카카오"}</dd>
			</dl>

			<h3 className="owner-section">가게</h3>
			<dl className="kv">
				<dt>상호</dt>
				<dd>{store.name}</dd>
				<dt>심사 상태</dt>
				<dd>{STORE_STATUS_LABEL[store.status]}</dd>
				<dt>종류</dt>
				<dd>{store.categories.map((item) => STORE_CATEGORY_LABEL[item]).join(", ")}</dd>
				<dt>주소</dt>
				<dd>
					{store.postalCode ? `(${store.postalCode}) ` : ""}
					{store.address}
					{store.addressDetail ? ` ${store.addressDetail}` : ""}
				</dd>
				<dt>연락처</dt>
				<dd>{store.phone}</dd>
				<dt>영업</dt>
				<dd>
					{store.businessOpenTime.slice(0, 5)} ~ {store.businessCloseTime.slice(0, 5)} ·{" "}
					{DAY_CHIPS.filter((chip) => store.businessDays.includes(chip.day))
						.map((chip) => chip.label)
						.join(" ")}
				</dd>
			</dl>

			<p className="app-hint">
				가게 정보를 <strong>수정</strong>하는 API 는 아직 없습니다 — 등록(<code>POST</code>)과
				조회(<code>GET /owner/stores/me</code>)뿐이고, 심사 상태는 관리자 화면에서 바뀝니다.
			</p>

			<DeviceTokenPanel accessToken={accessToken} />

			<button className="phone__cta phone__cta--ghost" type="button" onClick={onSignOut}>
				로그아웃
			</button>
		</div>
	);
}
