import { authorizedJsonBody } from "../../shared/api/http";
import type { UserProfile } from "../../shared/types/user";

export type UpdateProfileRequest = {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
};

/** PATCH /api/users/me — смена имени и/или пароля. */
export function updateProfile(request: UpdateProfileRequest) {
  return authorizedJsonBody<UserProfile>("PATCH", "/users/me", request);
}
