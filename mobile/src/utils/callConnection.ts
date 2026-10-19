import { User } from "../types/models";
/** True when either person follows the other, which is when Sohba allows a call. */
export function isCallConnection(currentUser: User, otherUserId: string, otherUser?: User | null) {
  return (
    currentUser.following.includes(otherUserId) ||
    currentUser.followers.includes(otherUserId) ||
    Boolean(otherUser?.following.includes(currentUser.id)) ||
    Boolean(otherUser?.followers.includes(currentUser.id))
  );
}
