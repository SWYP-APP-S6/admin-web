import { useCallback, useEffect, useState } from "react";
import { OWNER_FRAMES, OWNER_SCREENS } from "../flow/ownerSpec";
import type { OwnerScreenSpec } from "../flow/ownerSpec";
import { prepareOwner, runOwner } from "../flow/ownerRunner";
import type { OwnerProbe, OwnerScreenResult } from "../flow/ownerRunner";
import { lookUp } from "../flow/spec";
import type { FieldSpec } from "../flow/spec";

type Results = Record<string, OwnerScreenResult>;

type FieldState = "present" | "empty" | "absent" | "norows";

function fieldState(payload: unknown, field: FieldSpec): FieldState {
	const found = lookUp(payload, field.path);
	if (found.kind === "noRows") {
		return "norows";
	}
	if (found.kind === "blank") {
		return field.optional ? "empty" : "absent";
	}
	return "present";
}

function screenStage(screen: OwnerScreenSpec, result: OwnerScreenResult | undefined) {
	const missing = screen.missing?.length ?? 0;
	if (missing > 0) {
		return { label: `미구현 ${missing}건`, tone: "tag--rejected" };
	}
	if (!result || result.status !== "ok") {
		return { label: result?.status === "failed" ? "실패" : "확인 전", tone: "tag--pending" };
	}
	const states = (screen.fields ?? []).map((field) => fieldState(result.payload, field));
	const absent = states.filter((state) => state === "absent").length;
	if (absent > 0) {
		return { label: `필드 ${absent}개 없음`, tone: "tag--rejected" };
	}
	if (states.some((state) => state === "norows")) {
		return { label: "데이터 없음", tone: "tag--pending" };
	}
	if ((screen.gaps ?? []).length > 0) {
		return { label: "값은 옴 · 갭 있음", tone: "tag--pending" };
	}
	return { label: "준비됨", tone: "tag--completed" };
}

export function OwnerFlowCheckPage() {
	const [probe, setProbe] = useState<OwnerProbe | null>(null);
	const [results, setResults] = useState<Results>({});
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [open, setOpen] = useState<string | null>(null);

	const check = useCallback(async () => {
		setRunning(true);
		setError(null);
		try {
			const ready = await prepareOwner();
			setProbe(ready);
			const next: Results = {};
			for (const screen of OWNER_SCREENS) {
				next[screen.id] = await runOwner(screen, ready);
			}
			setResults(next);
		} catch (caught) {
			setError(caught instanceof Error ? caught : new Error("점검에 실패했습니다"));
		} finally {
			setRunning(false);
		}
	}, []);

	useEffect(() => {
		void check();
	}, [check]);

	const missing = OWNER_SCREENS.flatMap((screen) =>
		(screen.missing ?? []).map((item) => ({ id: screen.id, item })),
	);
	const gaps = OWNER_SCREENS.flatMap((screen) =>
		(screen.gaps ?? []).map((item) => ({ id: screen.id, item })),
	);
	const blocked = OWNER_SCREENS.filter((screen) => (screen.missing?.length ?? 0) > 0).length;

	return (
		<>
			<div className="page-head">
				<h1 className="page-title">점주 플로우 점검</h1>
				<span className="page-count">
					{running
						? "확인 중…"
						: `화면 ${OWNER_SCREENS.length}개 · 미구현 화면 ${blocked}개 · 빠진 것 ${missing.length}건 · 갭 ${gaps.length}건`}
				</span>
			</div>

			<p className="notice">
				피그마 「점주용 플로우」(O-0xx)를 그대로 옮겨 두고, 구현된 화면은{" "}
				<strong>실제 API 를 호출해</strong> 값이 오는지 확인합니다. 아직 서버가 그릴 수 없는
				화면은 <strong>무엇이 없어서인지</strong>를 적어 둡니다 — 점검은{" "}
				<strong>읽기 API 만</strong> 부릅니다(상품 등록·수량 변경은 소비자 쪽 재고를 움직입니다).
				눌러보는 쪽은 <code>점주 앱 테스트</code> 입니다.
			</p>

			<div className="row-actions" style={{ marginBottom: 16 }}>
				<button className="button button--primary" type="button" disabled={running} onClick={check}>
					{running ? "확인 중…" : "다시 점검"}
				</button>
			</div>

			{error && <p className="state state--error">{error.message}</p>}
			{probe?.blocker && <p className="state state--error">{probe.blocker}</p>}

			{OWNER_FRAMES.map((frame) => (
				<section key={frame} style={{ marginBottom: 24 }}>
					<h2 className="panel__title" style={{ marginBottom: 8 }}>
						{frame}
					</h2>
					<div className="flow-board">
						{OWNER_SCREENS.filter((screen) => screen.frame === frame).map((screen) => {
							const result = results[screen.id];
							const stage = screenStage(screen, result);
							const expanded = open === screen.id;
							return (
								<article className="flow-card" key={screen.id}>
									<button
										className="flow-card__head"
										type="button"
										onClick={() => setOpen(expanded ? null : screen.id)}
									>
										<span>
											<code>{screen.id}</code> {screen.name}
										</span>
										<span className={`tag ${stage.tone}`}>{stage.label}</span>
									</button>

									{screen.apis.length > 0 && (
										<div className="flow-card__apis">
											{screen.apis.map((api) => (
												<code key={api}>{api}</code>
											))}
										</div>
									)}

									{result?.status === "skipped" && (
										<p className="flow-card__skip">{result.reason}</p>
									)}
									{result?.status === "failed" && (
										<p className="state state--error" style={{ margin: 0 }}>
											{result.reason}
										</p>
									)}

									{result?.status === "ok" && (screen.fields ?? []).length > 0 && (
										<ul className="flow-fields">
											{screen.fields!.map((field) => {
												const state = fieldState(result.payload, field);
												return (
													<li className={`flow-field flow-field--${state}`} key={field.path}>
														<span>
															{state === "present"
																? "✓"
																: state === "absent"
																	? "✗"
																	: state === "norows"
																		? "?"
																		: "–"}
														</span>
														<span>{field.label}</span>
														<code>{field.path}</code>
													</li>
												);
											})}
										</ul>
									)}

									{screen.missing?.map((item) => (
										<p className="flow-missing" key={item}>
											✗ {item}
										</p>
									))}
									{screen.gaps?.map((gap) => (
										<p className="flow-gap" key={gap}>
											⬜ {gap}
										</p>
									))}
									{screen.notes?.map((note) => (
										<p className="flow-note" key={note}>
											· {note}
										</p>
									))}

									{expanded && result?.payload !== undefined && (
										<pre className="flow-raw">{JSON.stringify(result.payload, null, 2)}</pre>
									)}
								</article>
							);
						})}
					</div>
				</section>
			))}

			<section style={{ marginBottom: 24 }}>
				<h2 className="panel__title" style={{ marginBottom: 8 }}>
					서버에 아직 없는 것 {missing.length}건
				</h2>
				<ul className="flow-summary">
					{missing.map(({ id, item }) => (
						<li key={`${id}-${item}`}>
							<code>{id}</code> {item}
						</li>
					))}
				</ul>
			</section>

			<section>
				<h2 className="panel__title" style={{ marginBottom: 8 }}>
					값은 오지만 화면과 어긋나는 것 {gaps.length}건
				</h2>
				<ul className="flow-summary">
					{gaps.map(({ id, item }) => (
						<li key={`${id}-${item}`}>
							<code>{id}</code> {item}
						</li>
					))}
				</ul>
			</section>
		</>
	);
}
