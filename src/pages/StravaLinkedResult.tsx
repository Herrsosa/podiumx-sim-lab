import { useMemo } from "react";

export default function StravaLinkedResult() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const ok = params.get("ok");
  const athlete = params.get("athlete");
  const reason = params.get("reason");
  const v = params.get("v");

  const success = ok === "1";

  return (
    <div style={{ padding: 24 }}>
      <h1>Strava Link {success ? "Success" : "Result"}</h1>
      <p>Handler version: {v ?? "-"}</p>
      {success ? (
        <p>
          ✅ Connected
          {athlete ? ` (athlete ${athlete})` : ""}.
        </p>
      ) : (
        <p>
          ⚠️ Could not connect. {reason ? `Reason: ${reason}` : "Try again."}
        </p>
      )}
      <a href="/">Back to app</a>
    </div>
  );
}
