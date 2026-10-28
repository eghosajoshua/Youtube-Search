import { useState } from "react";

export default function LoginPage({ onLogin }) {
  const [pass, setPass] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await onLogin(username, pass);

    setLoading(false);
    if (!res.success) setError(res.error ?? "Invalid password");
  }

  return (
    <div className="min-h-screen app-canvas flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="login-mark" aria-hidden="true">
            YT
          </div>
          <h1 className="text-2xl font-bold text-gray-900">YouTube Search</h1>
          <p className="text-gray-600 text-sm mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={submit} className="login-form space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter username"
              autoFocus
              className="login-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={pass}
              required
              onChange={(e) => setPass(e.target.value)}
              placeholder="Enter password"
              className="login-input"
            />
          </div>

          {error && (
            <p
              className="text-sm text-red-700 bg-red-50 border border-red-200
                           rounded-md px-3 py-2"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !pass}
            className="w-full text-white py-2.5 bg-teal-700 hover:bg-teal-800 rounded-md text-sm
                       font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
          <p className="text-center text-xs text-gray-600">
            Demo login:{" "}
            <span className="font-medium text-gray-800">
              <span className="text-gray-300">username :</span>admin
            </span>
            <span className="mx-1.5 text-gray-400">/</span>
            <span className="font-medium text-gray-800">
              <span className="text-gray-300">password :</span>admin123
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
