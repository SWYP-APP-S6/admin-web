import { useState } from "react";
import type { FormEvent } from "react";

export interface IdField {
	key: string;
	label: string;
}

interface IdFiltersProps {
	fields: IdField[];
	initial: Record<string, string>;
	onApply: (values: Record<string, string>) => void;
}

// id 로 좁히는 입력 묶음. 글자마다 요청하지 않고 「적용」에서만 반영한다. 부모가 URL 문자열을
// key 로 주면 뒤로가기로 URL 이 바뀔 때 새 초기값으로 다시 만들어진다.
export function IdFilters({ fields, initial, onApply }: IdFiltersProps) {
	const [draft, setDraft] = useState<Record<string, string>>(initial);

	function submit(event: FormEvent) {
		event.preventDefault();
		onApply(draft);
	}

	function reset() {
		onApply(Object.fromEntries(fields.map((field) => [field.key, ""])));
	}

	return (
		<form className="filters filters--form" onSubmit={submit}>
			{fields.map((field) => (
				<label key={field.key} className="field field--inline">
					<span className="field__label">{field.label}</span>
					<input
						className="field__input field__input--short"
						type="number"
						min={1}
						value={draft[field.key] ?? ""}
						onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
					/>
				</label>
			))}
			<div className="row-actions">
				<button type="submit" className="button button--primary">
					적용
				</button>
				<button type="button" className="button" onClick={reset}>
					초기화
				</button>
			</div>
		</form>
	);
}
