import { useState, useEffect } from "react";

export default function useAuth() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth.php?action=check")
      .then((r) => r.json())
      .then((j) => {
        setAuthed(j.data?.authed ?? false);
        setUser(j.data?.user ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const data = new FormData();
    data.append("password", password);
    data.append("username", username);

    try {
      const res = await fetch("/api/auth.php?action=login", {
        method: "POST",
        body: data,
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return {
          success: false,
          error: "Unable to reach the authentication server.",
        };
      }

      const json = await res.json();
      if (json.success) {
        setAuthed(true);
        setUser(json.data?.user ?? { username });
      }
      return json;
    } catch {
      return {
        success: false,
        error: "Unable to reach the authentication server.",
      };
    }
  }

  async function logout() {
    await fetch("/api/auth.php?action=logout", { method: "POST" });
    setAuthed(false);
    setUser(null);
  }

  return { authed, loading, user, login, logout };
}
