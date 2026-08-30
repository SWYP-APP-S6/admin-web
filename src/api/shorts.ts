import { getAccessToken } from "../auth/tokens";
import { request } from "./client";
import type {
	ShortsClip,
	ShortsCost,
	ShortsHealth,
	ShortsJob,
	ShortsSource,
	ShortsSourceDetail,
	ShortsUtterance,
} from "../types";

export function fetchShortsHealth(): Promise<ShortsHealth> {
	return request<ShortsHealth>("/admin/shorts/health");
}

export function fetchShortsSources(): Promise<ShortsSource[]> {
	return request<ShortsSource[]>("/admin/shorts/sources");
}

export function fetchShortsSource(sourceId: number): Promise<ShortsSourceDetail> {
	return request<ShortsSourceDetail>(`/admin/shorts/sources/${sourceId}`);
}

export function fetchUtterances(chunkId: number): Promise<ShortsUtterance[]> {
	return request<ShortsUtterance[]>(`/admin/shorts/chunks/${chunkId}/utterances`);
}

export function runStt(chunkId: number, force = true): Promise<ShortsJob> {
	return request<ShortsJob>(`/admin/shorts/chunks/${chunkId}/stt`, {
		method: "POST",
		body: { force },
	});
}

export function runSegment(chunkId: number, force = true): Promise<ShortsJob> {
	return request<ShortsJob>(`/admin/shorts/chunks/${chunkId}/segment?force=${force}`, {
		method: "POST",
	});
}

export function runRank(sourceId: number, criteria: string | null): Promise<ShortsJob> {
	return request<ShortsJob>(`/admin/shorts/sources/${sourceId}/rank`, {
		method: "POST",
		body: { criteria },
	});
}

export function runPipeline(
	sourceId: number,
	criteria: string | null,
	resegment = false,
): Promise<ShortsJob> {
	return request<ShortsJob>(`/admin/shorts/sources/${sourceId}/pipeline?resegment=${resegment}`, {
		method: "POST",
		body: { criteria },
	});
}

export function fetchTotalCost(): Promise<ShortsCost> {
	return request<ShortsCost>("/admin/shorts/cost");
}

export function runCut(runId: number, segmentId: number, replace = false): Promise<ShortsJob> {
	return request<ShortsJob>(
		`/admin/shorts/runs/${runId}/segments/${segmentId}/cut?replace=${replace}`,
		{ method: "POST" },
	);
}

export function renderClip(clipId: number, force = false): Promise<ShortsJob> {
	return request<ShortsJob>(`/admin/shorts/clips/${clipId}/render?force=${force}`, {
		method: "POST",
	});
}

export function fetchJob(jobId: string): Promise<ShortsJob> {
	return request<ShortsJob>(`/admin/shorts/jobs/${jobId}`);
}

export function reviewClip(clip: ShortsClip, verdict: "OK" | "NG", note?: string): Promise<void> {
	return request<void>(`/admin/shorts/clips/${clip.id}/review`, {
		method: "POST",
		body: { verdict, note: note ?? null },
	});
}

export function fetchSegmentPreviewUrl(segmentId: number): Promise<string> {
	return fetchMediaObjectUrl(`/admin/shorts/segments/${segmentId}/preview`);
}

// 클립 파일은 /admin/** 이라 Authorization 헤더가 필요하다. <video src> 는 헤더를 못 붙이므로
// blob 으로 받아 object URL 로 넘긴다 — 쓰고 나면 호출부에서 revoke 한다.
export async function fetchMediaObjectUrl(path: string): Promise<string> {
	const base = import.meta.env.VITE_API_BASE_URL ?? "/api";
	const response = await fetch(`${base}${path}`, {
		headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
	});
	if (!response.ok) {
		throw new Error(`영상을 불러오지 못했습니다 (${response.status})`);
	}
	return URL.createObjectURL(await response.blob());
}

export function fetchClipObjectUrl(clipId: number): Promise<string> {
	return fetchMediaObjectUrl(`/admin/shorts/clips/${clipId}/file`);
}
