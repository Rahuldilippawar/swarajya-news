import type { NewsStatus } from "./newsStatus";
import type { Role, UserStatus } from "./roles";

/**
 * Request and response shapes of the callable Cloud Functions, shared by the
 * panels (callers) and the functions (handlers) so both sides stay in sync.
 */
export interface CallableApi {
  createStaffUser: {
    request: { email: string; fullName: string; role: Role; assignedLocations?: string[] };
    /** The password-setup link must be handed to the new user over a trusted channel. */
    response: { uid: string; reporterId: string | null; passwordSetupLink: string };
  };
  setStaffRole: {
    request: { uid: string; role: Role };
    response: { uid: string; role: Role; reporterId: string | null };
  };
  setStaffStatus: {
    request: { uid: string; status: UserStatus };
    response: { uid: string; status: UserStatus };
  };
  updateStaffProfile: {
    request: { uid: string; fullName?: string; assignedLocations?: string[] };
    response: { uid: string };
  };
  transitionNews: {
    request: { newsId: string; to: NewsStatus; remarks?: string };
    response: { newsId: string; status: NewsStatus; slug: string; videoStatus: VideoStatus | null };
  };
}

export type VideoStatus = "UNVERIFIED" | "AVAILABLE" | "UNAVAILABLE";

export type CallableName = keyof CallableApi;
export type CallableRequest<N extends CallableName> = CallableApi[N]["request"];
export type CallableResponse<N extends CallableName> = CallableApi[N]["response"];
