import { request } from "./client";
import type { MyLocation } from "../types";

export function fetchMyLocation(accessToken: string): Promise<MyLocation> {
	return request<MyLocation>("/users/me/location", { accessToken });
}

// 좌표 → 행정동 이름 변환은 앱이 한다. 서버는 헤더에 찍을 이름을 받아 두기만 한다.
export function setMyLocation(
	region: { regionName: string; latitude: number; longitude: number },
	accessToken: string,
): Promise<MyLocation> {
	return request<MyLocation>("/users/me/location", {
		method: "PUT",
		body: region,
		accessToken,
	});
}
