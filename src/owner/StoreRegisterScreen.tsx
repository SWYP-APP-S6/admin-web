import { useState } from "react";
import { registerStore } from "../api/owner";
import { ErrorNote, asError } from "../app/shared";
import { DAY_CHIPS, STORE_CATEGORY_LABEL } from "./session";
import type { DayOfWeek, StoreCategory, StoreDetail } from "../types";

const MAX_CATEGORIES = 3;

interface Props {
	accessToken: string;
	onRegistered: (store: StoreDetail) => void;
}

/**
 * O-003 상점 정보 등록 Step1 · Step2. 한 번에 `POST /owner/stores` 로 보낸다 -- 서버가 단계를
 * 나눠 받지 않으므로 Step1 은 화면 분할일 뿐이고, 등록되는 순간 PENDING 으로 심사에 올라간다.
 */
export function StoreRegisterScreen({ accessToken, onRegistered }: Props) {
	const [step, setStep] = useState<1 | 2>(1);
	const [name, setName] = useState("");
	const [categories, setCategories] = useState<StoreCategory[]>([]);
	const [postalCode, setPostalCode] = useState("");
	const [address, setAddress] = useState("");
	const [addressDetail, setAddressDetail] = useState("");
	const [phone, setPhone] = useState("");
	const [openTime, setOpenTime] = useState("09:00");
	const [closeTime, setCloseTime] = useState("20:00");
	const [days, setDays] = useState<DayOfWeek[]>([
		"MONDAY",
		"TUESDAY",
		"WEDNESDAY",
		"THURSDAY",
		"FRIDAY",
	]);
	const [registrationNumber, setRegistrationNumber] = useState("");
	const [note, setNote] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const step1Ready = name.trim() !== "" && categories.length > 0 && address.trim() !== "";
	const step2Ready = phone.trim() !== "" && days.length > 0;

	function toggleCategory(category: StoreCategory) {
		setCategories((current) =>
			current.includes(category)
				? current.filter((item) => item !== category)
				: current.length >= MAX_CATEGORIES
					? current
					: [...current, category],
		);
	}

	function toggleDay(day: DayOfWeek) {
		setDays((current) =>
			current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
		);
	}

	async function submit() {
		setBusy(true);
		setError(null);
		try {
			onRegistered(
				await registerStore(
					{
						name: name.trim(),
						categories,
						postalCode: postalCode.trim() === "" ? null : postalCode.trim(),
						address: address.trim(),
						addressDetail: addressDetail.trim() === "" ? null : addressDetail.trim(),
						phone: phone.trim(),
						businessOpenTime: openTime,
						businessCloseTime: closeTime,
						businessDays: days,
						businessRegistrationNumber:
							registrationNumber.trim() === "" ? null : registrationNumber.trim(),
						applicationNote: note.trim() === "" ? null : note.trim(),
					},
					accessToken,
				),
			);
		} catch (caught) {
			setError(asError(caught));
		} finally {
			setBusy(false);
		}
	}

	if (step === 1) {
		return (
			<div className="app-screen">
				<h2 className="app-title">
					가게 정보를 등록해주시면
					<br />
					확인 후 연락드려요 ☎️
				</h2>

				<label className="field">
					<span className="field__label">상호 *</span>
					<span className="field__hint">가게명을 입력해주세요.</span>
					<input
						className="field__input"
						value={name}
						maxLength={100}
						placeholder="청과마을"
						onChange={(event) => setName(event.target.value)}
					/>
				</label>

				<div className="field">
					<span className="field__label">가게 종류 * (최대 {MAX_CATEGORIES}개)</span>
					<span className="field__hint">가게에서 주로 판매하시는 품목을 선택해주세요.</span>
					<div className="filters">
						{(Object.keys(STORE_CATEGORY_LABEL) as StoreCategory[]).map((category) => (
							<button
								key={category}
								type="button"
								className={categories.includes(category) ? "chip chip--active" : "chip"}
								onClick={() => toggleCategory(category)}
							>
								{STORE_CATEGORY_LABEL[category]}
							</button>
						))}
					</div>
				</div>

				<div className="field">
					<span className="field__label">주소 *</span>
					<span className="field__hint">
						우편번호 검색은 앱이 합니다(Daum 우편번호 서비스) — 서버는 주소 문자열만 받아
						카카오 로컬 API 로 좌표를 찍습니다.
					</span>
					<input
						className="field__input"
						value={postalCode}
						placeholder="우편번호 (5자리, 선택)"
						onChange={(event) => setPostalCode(event.target.value)}
					/>
					<input
						className="field__input"
						value={address}
						placeholder="주소"
						onChange={(event) => setAddress(event.target.value)}
						style={{ marginTop: 8 }}
					/>
					<input
						className="field__input"
						value={addressDetail}
						placeholder="상세 주소"
						onChange={(event) => setAddressDetail(event.target.value)}
						style={{ marginTop: 8 }}
					/>
				</div>

				<button
					className="phone__cta"
					type="button"
					disabled={!step1Ready}
					onClick={() => setStep(2)}
				>
					다음
				</button>
			</div>
		);
	}

	return (
		<div className="app-screen">
			<h2 className="app-title">
				가게 운영 정보를
				<br />
				입력해주세요.
			</h2>

			<label className="field">
				<span className="field__label">연락처 *</span>
				<input
					className="field__input"
					value={phone}
					placeholder="02-000-0000"
					onChange={(event) => setPhone(event.target.value)}
				/>
				<span className="field__hint owner-warn">
					⚠️ 입력하신 번호는 모든 소비자에게 공개됩니다. 매장 전용 번호를 입력해 주세요
				</span>
			</label>

			<div className="field">
				<span className="field__label">영업 시간 *</span>
				<span className="field__hint">
					상품 등록 시 픽업 종료시간의 기본값이 됩니다(미입력이면 서버가 이 시각으로 채웁니다).
				</span>
				<div className="owner-times">
					<input
						className="field__input"
						type="time"
						value={openTime}
						onChange={(event) => setOpenTime(event.target.value)}
					/>
					<span>~</span>
					<input
						className="field__input"
						type="time"
						value={closeTime}
						onChange={(event) => setCloseTime(event.target.value)}
					/>
				</div>
			</div>

			<div className="field">
				<span className="field__label">영업 요일 *</span>
				<div className="owner-days">
					{DAY_CHIPS.map(({ day, label }) => (
						<button
							key={day}
							type="button"
							className={days.includes(day) ? "owner-day owner-day--on" : "owner-day"}
							onClick={() => toggleDay(day)}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			<label className="field">
				<span className="field__label">사업자등록번호</span>
				<span className="field__hint">피그마에는 없지만 서버가 받는 값입니다(심사용, 선택).</span>
				<input
					className="field__input"
					value={registrationNumber}
					onChange={(event) => setRegistrationNumber(event.target.value)}
				/>
			</label>

			<label className="field">
				<span className="field__label">신청 메모</span>
				<input
					className="field__input"
					value={note}
					onChange={(event) => setNote(event.target.value)}
				/>
			</label>

			{error && <ErrorNote error={error} />}

			<button className="phone__cta" type="button" disabled={!step2Ready || busy} onClick={submit}>
				{busy ? "등록 중…" : "등록 신청"}
			</button>
			<button
				className="phone__cta phone__cta--ghost"
				type="button"
				disabled={busy}
				onClick={() => setStep(1)}
			>
				이전
			</button>
		</div>
	);
}
