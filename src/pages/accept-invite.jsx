import { useEffect } from "react";

export default function AcceptInviteRedirect() {
  useEffect(() => {
    // Redirect von /accept-invite zu /AcceptInvite (inklusive query params)
    const search = window.location.search;
    window.location.href = `/AcceptInvite${search}`;
  }, []);

  return null;
}