import { useState } from "react";
import type { FormEvent } from "react";
import { changePassword } from "../api/auth";

// 백엔드의 @Size(min = 8) 과 맞춘다. 여기서 먼저 막으면 왕복 없이 바로 알려줄 수 있다.
const MIN_LENGTH = 8;

interface Status {
	kind: "error" | "success";
	message: string;
}

export function PasswordPage() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [status, setStatus] = useState<Status | null>(null);
	const [submitting, setSubmitting] = useState(false);

	function validate(): string | null {
		if (newPassword.length < MIN_LENGTH) {
			return `새 비밀번호는 ${MIN_LENGTH}자 이상이어야 합니다.`;
		}
		if (newPassword !== confirmation) {
			return "새 비밀번호가 서로 다릅니다.";
		}
		if (newPassword === currentPassword) {
			return "지금 쓰는 비밀번호와 같습니다.";
		}
		return null;
	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();

		const problem = validate();
		if (problem) {
			setStatus({ kind: "error", message: problem });
			return;
		}

		setStatus(null);
		setSubmitting(true);
		try {
			await changePassword(currentPassword, newPassword);
			setStatus({ kind: "success", message: "비밀번호를 변경했습니다." });
			setCurrentPassword("");
			setNewPassword("");
			setConfirmation("");
		} catch (caught) {
			setStatus({
				kind: "error",
				message: caught instanceof Error ? caught.message : "변경에 실패했습니다.",
			});
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<section className="narrow">
			<div className="page-head">
				<h1 className="page-title">비밀번호 변경</h1>
			</div>

			<p className="notice">
				초기 비밀번호는 전화번호(숫자만)입니다. 팀원 모두가 아는 값이므로 처음 로그인했다면 지금
				바꿔주세요.
			</p>

			<form className="form-card" onSubmit={handleSubmit}>
				<label className="field">
					<span className="field__label">현재 비밀번호</span>
					<input
						className="field__input"
						type="password"
						value={currentPassword}
						onChange={(event) => setCurrentPassword(event.target.value)}
						autoComplete="current-password"
						required
					/>
				</label>

				<label className="field">
					<span className="field__label">새 비밀번호 ({MIN_LENGTH}자 이상)</span>
					<input
						className="field__input"
						type="password"
						value={newPassword}
						onChange={(event) => setNewPassword(event.target.value)}
						autoComplete="new-password"
						required
					/>
				</label>

				<label className="field">
					<span className="field__label">새 비밀번호 확인</span>
					<input
						className="field__input"
						type="password"
						value={confirmation}
						onChange={(event) => setConfirmation(event.target.value)}
						autoComplete="new-password"
						required
					/>
				</label>

				{status && (
					<p className={status.kind === "error" ? "form-message form-message--error" : "form-message form-message--success"}>
						{status.message}
					</p>
				)}

				<button className="button button--primary" type="submit" disabled={submitting}>
					{submitting ? "변경 중…" : "변경"}
				</button>
			</form>
		</section>
	);
}
