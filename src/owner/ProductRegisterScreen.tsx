import { useState } from "react";
import { previewProduct, registerProduct, uploadProductPhoto } from "../api/owner";
import { ErrorNote, asError, won } from "../app/shared";
import { PRODUCT_CATEGORY_LABEL } from "./session";
import type {
	OwnerProductDetail,
	ProductCategory,
	ProductPreview,
	ProductRegisterPayload,
} from "../types";

function discountRateOf(originalPrice: number, salePrice: number): number {
	if (originalPrice <= 0 || salePrice <= 0 || salePrice >= originalPrice) {
		return 0;
	}
	return Math.round(((originalPrice - salePrice) * 100) / originalPrice);
}

interface Props {
	accessToken: string;
	/** 픽업 종료시간의 기본값. 미입력으로 보내면 서버가 이 시각으로 채운다. */
	businessCloseTime: string;
	onRegistered: (product: OwnerProductDetail) => void;
	onCancel: () => void;
}

/**
 * O-020 Step1~3 + O-021 미리보기. 서버는 한 번의 `POST /owner/products` 로 받으므로 단계는
 * 화면 분할일 뿐이다. 할인율은 서버가 저장 시 다시 계산하고(Product.discountRateOf), 여기서는
 * 같은 식으로 미리 보여준다.
 */
export function ProductRegisterScreen({
	accessToken,
	businessCloseTime,
	onRegistered,
	onCancel,
}: Props) {
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [preview, setPreview] = useState<ProductPreview | null>(null);
	const [photoUrl, setPhotoUrl] = useState("");
	const [uploading, setUploading] = useState(false);
	const [name, setName] = useState("");
	const [category, setCategory] = useState<ProductCategory>("ETC");
	const [qty, setQty] = useState(1);
	const [originalPrice, setOriginalPrice] = useState("");
	const [salePrice, setSalePrice] = useState("");
	const [pickupEndAt, setPickupEndAt] = useState("");
	const [tags, setTags] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const original = Number(originalPrice) || 0;
	const sale = Number(salePrice) || 0;
	const rate = discountRateOf(original, sale);

	const step1Ready = photoUrl !== "" && name.trim() !== "";

	// 서버는 자기가 저장한 URL 만 받는다. 파일을 고르는 즉시 올리고 돌아온 주소를 들고 간다.
	async function upload(file: File) {
		setUploading(true);
		setError(null);
		try {
			setPhotoUrl((await uploadProductPhoto(file, accessToken)).photoUrl);
		} catch (caught) {
			setError(asError(caught));
			setPhotoUrl("");
		} finally {
			setUploading(false);
		}
	}
	const step2Ready = qty >= 1 && original > 0 && sale > 0 && sale < original;

	const ingredientTags = tags
		.split(",")
		.map((piece) => Number(piece.trim()))
		.filter((value) => Number.isInteger(value) && value > 0);

	function payload(): ProductRegisterPayload {
		return {
			name: name.trim(),
			category,
			initialQty: qty,
			originalPrice: original,
			salePrice: sale,
			photoUrl: photoUrl.trim(),
			ingredientTags,
			pickupEndAt: pickupEndAt === "" ? null : `${pickupEndAt}:00`,
		};
	}

	// 미리보기를 화면이 조립하지 않고 서버에 물어본다. 할인율·픽업 창을 등록과 같은 규칙으로
	// 계산해 주고, 가격·재료 id 가 틀렸다면 상품이 만들어지기 전에 여기서 거절된다.
	async function openPreview() {
		setBusy(true);
		setError(null);
		try {
			setPreview(await previewProduct(payload(), accessToken));
		} catch (caught) {
			setError(asError(caught));
		} finally {
			setBusy(false);
		}
	}

	async function submit() {
		setBusy(true);
		setError(null);
		try {
			onRegistered(await registerProduct(payload(), accessToken));
		} catch (caught) {
			setError(asError(caught));
			setPreview(null);
		} finally {
			setBusy(false);
		}
	}

	if (preview) {
		return (
			<div className="app-screen">
				<div className="sheet">
					<h3 className="app-title" style={{ fontSize: 18 }}>
						상품 미리보기
					</h3>
					<p className="app-sub">손님께는 이렇게 보여요.</p>

					<div className="app-item">
						<img className="app-item__thumb" src={preview.photoUrl} alt="" />
						<span className="app-item__body">
							<span className="app-item__name">{preview.name}</span>
							<span className="app-item__price">
								<b>{won(preview.salePrice)}</b> <s>{won(preview.originalPrice)}</s>
							</span>
							<span className="app-item__meta">
								{preview.discountRate}% 할인 · {preview.initialQty}개 남음
							</span>
						</span>
					</div>

					<div className="phone__row">
						<strong>픽업</strong>
						{preview.pickupStartAt.slice(11, 16)} ~ {preview.pickupEndAt.slice(11, 16)}
					</div>
					<p className="app-hint">
						서버가 <code>POST /owner/products/preview</code> 로 계산한 값입니다 — 저장되지
						않았고, 할인율과 픽업 창은 등록될 때와 같은 규칙으로 나왔습니다.
					</p>

					{error && <ErrorNote error={error} />}

					<div className="owner-sheet__actions">
						<button
							className="phone__cta phone__cta--ghost"
							type="button"
							disabled={busy}
							onClick={() => setPreview(null)}
						>
							수정하기
						</button>
						<button className="phone__cta" type="button" disabled={busy} onClick={submit}>
							{busy ? "등록 중…" : "등록하기"}
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (step === 1) {
		return (
			<div className="app-screen">
				<h2 className="app-title">
					오늘은 어떤 상품을
					<br />
					판매하실 건가요?
				</h2>

				<div className="field">
					<span className="field__label">사진 * (1장)</span>
					<span className="field__hint">
						jpg · png, 10MB 까지. 고르면 바로 올라가고, 서버는 <strong>여기서 올린 사진만</strong>{" "}
						상품에 붙일 수 있습니다.
					</span>
					<input
						className="field__input"
						type="file"
						accept="image/png,image/jpeg"
						disabled={uploading}
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (file) {
								void upload(file);
							}
						}}
					/>
					{uploading && <p className="state">올리는 중…</p>}
					{photoUrl !== "" && (
						<div className="owner-photos">
							<span className="owner-photo owner-photo--on">
								<img src={photoUrl} alt="" />
							</span>
						</div>
					)}
					{photoUrl !== "" && <span className="field__hint"><code>{photoUrl}</code></span>}
				</div>

				<label className="field">
					<span className="field__label">품목명 *</span>
					<span className="field__hint">판매하실 상품명 · 중량 등을 입력해주세요. (최대 30자)</span>
					<input
						className="field__input"
						value={name}
						maxLength={30}
						placeholder="예시) 복숭아 4입"
						onChange={(event) => setName(event.target.value)}
					/>
				</label>

				<div className="field">
					<span className="field__label">카테고리</span>
					<span className="field__hint">피그마에는 없지만 소비자 홈의 칩 필터가 이 값을 씁니다.</span>
					<div className="filters">
						{(Object.keys(PRODUCT_CATEGORY_LABEL) as ProductCategory[]).map((item) => (
							<button
								key={item}
								type="button"
								className={item === category ? "chip chip--active" : "chip"}
								onClick={() => setCategory(item)}
							>
								{PRODUCT_CATEGORY_LABEL[item]}
							</button>
						))}
					</div>
				</div>

				{error && <ErrorNote error={error} />}

				<button
					className="phone__cta"
					type="button"
					disabled={!step1Ready || uploading}
					onClick={() => setStep(2)}
				>
					다음
				</button>
				<button className="phone__cta phone__cta--ghost" type="button" onClick={onCancel}>
					그만두기
				</button>
			</div>
		);
	}

	if (step === 2) {
		return (
			<div className="app-screen">
				<h2 className="app-title">
					어떤 가격에,
					<br />
					얼마나 판매할까요?
				</h2>

				<div className="field">
					<span className="field__label">수량 *</span>
					<span className="field__hint">판매 가능한 개수를 입력해주세요.</span>
					<div className="stepper__controls">
						<button
							className="stepper__button"
							type="button"
							disabled={qty <= 1}
							onClick={() => setQty((current) => current - 1)}
						>
							−
						</button>
						<strong>{qty}</strong>
						<button
							className="stepper__button"
							type="button"
							onClick={() => setQty((current) => current + 1)}
						>
							+
						</button>
					</div>
				</div>

				<label className="field">
					<span className="field__label">정가 *</span>
					<span className="field__hint">기존 가격을 입력해주세요.</span>
					<input
						className="field__input"
						inputMode="numeric"
						value={originalPrice}
						placeholder="₩ 10,000"
						onChange={(event) => setOriginalPrice(event.target.value.replace(/[^0-9]/g, ""))}
					/>
				</label>

				<label className="field">
					<span className="field__label">할인가 *</span>
					<span className="field__hint">판매하실 가격을 입력해주세요.</span>
					<input
						className="field__input"
						inputMode="numeric"
						value={salePrice}
						placeholder="₩ 4,000"
						onChange={(event) => setSalePrice(event.target.value.replace(/[^0-9]/g, ""))}
					/>
				</label>

				<div className="owner-rate">
					<span>최종 할인율</span>
					<strong>{rate}%</strong>
				</div>
				<p className="owner-rate__save">{won(Math.max(0, original - sale))}이 저렴해져요</p>
				{original > 0 && sale >= original && (
					<p className="state state--error">
						할인가는 정가보다 낮아야 합니다 — 서버도 <code>INVALID_PRICE</code> 로 막습니다.
					</p>
				)}

				<button className="phone__cta" type="button" disabled={!step2Ready} onClick={() => setStep(3)}>
					다음
				</button>
				<button className="phone__cta phone__cta--ghost" type="button" onClick={() => setStep(1)}>
					이전
				</button>
			</div>
		);
	}

	return (
		<div className="app-screen">
			<h2 className="app-title">
				판매에 필요한 정보를
				<br />
				더 알려주세요.
			</h2>

			<label className="field">
				<span className="field__label">픽업 종료시간</span>
				<span className="field__hint">
					미입력 시 기존 운영 시간({businessCloseTime.slice(0, 5)})으로 설정됩니다. 지금부터
					24시간을 넘기면 서버가 <code>INVALID_PICKUP_WINDOW</code> 로 막습니다.
				</span>
				<input
					className="field__input"
					type="datetime-local"
					value={pickupEndAt}
					onChange={(event) => setPickupEndAt(event.target.value)}
				/>
			</label>

			<label className="field">
				<span className="field__label">식자재 태그 (최대 5개)</span>
				<span className="field__hint">
					서버는 <code>ingredients</code> 테이블의 <strong>id 숫자</strong>만 받습니다 — 이름으로
					검색하는 API 가 없어 여기서는 쉼표로 구분한 id 를 직접 넣습니다(예: <code>1, 2</code>).
					없는 id 를 넣으면 <code>INGREDIENT_NOT_FOUND</code> 입니다.
				</span>
				<input
					className="field__input"
					value={tags}
					placeholder="1, 2, 3"
					onChange={(event) => setTags(event.target.value)}
				/>
				{ingredientTags.length > 0 && (
					<span className="field__hint">보낼 값: [{ingredientTags.join(", ")}]</span>
				)}
			</label>

			{error && <ErrorNote error={error} />}

			<button
				className="phone__cta"
				type="button"
				disabled={busy || ingredientTags.length > 5}
				onClick={openPreview}
			>
				{busy ? "확인 중…" : "등록하기"}
			</button>
			<button className="phone__cta phone__cta--ghost" type="button" onClick={() => setStep(2)}>
				이전
			</button>
		</div>
	);
}
