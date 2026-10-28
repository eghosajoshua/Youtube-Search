import { useState, useEffect } from "react";

const STATUS_META = {
  ok: {
    color: "text-green-400",
    bg: "bg-green-900/30 border-green-800",
    icon: "✅",
    label: "Working",
  },
  quota: {
    color: "text-yellow-400",
    bg: "bg-yellow-900/30 border-yellow-800",
    icon: "⚠️",
    label: "Quota exhausted",
  },
  invalid: {
    color: "text-red-400",
    bg: "bg-red-900/30 border-red-800",
    icon: "❌",
    label: "Invalid key",
  },
  error: {
    color: "text-orange-400",
    bg: "bg-orange-900/30 border-orange-800",
    icon: "🔴",
    label: "Error",
  },
  pending: {
    color: "text-gray-400",
    bg: "bg-gray-800 border-gray-700",
    icon: "⏳",
    label: "Verifying…",
  },
  unsaved: {
    color: "text-gray-500",
    bg: "bg-gray-800/50 border-gray-700",
    icon: "➕",
    label: "Not verified yet",
  },
};

export default function SettingsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Change password disabled
  // const [curPass, setCurPass] = useState("");
  // const [newPass, setNewPass] = useState("");
  // const [passMsg, setPassMsg] = useState(null);
  // const [passLoading, setPassLoading] = useState(false);

  // User management (admin only)
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersMsg, setUsersMsg] = useState(null);
  // Create user disabled
  // const [newUserForm, setNewUserForm] = useState({
  //   username: "",
  //   password: "",
  // });
  // const [creatingUser, setCreatingUser] = useState(false);
  // const [createUserMsg, setCreateUserMsg] = useState(null);
  // per-user multi-key management
  const [userKeys, setUserKeys] = useState([]); // { key, status, reason }
  const [newKeyInput, setNewKeyInput] = useState("");
  const [keysLoading, setKeysLoading] = useState(false);
  const [keysMsg, setKeysMsg] = useState(null);

  useEffect(() => {
    (async () => {
      await loadUserInfo();
    })();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;
    (async () => {
      try {
        const keyResponse = await fetch("/api/settings.php?action=get");
        const keyData = await keyResponse.json();
        if (!keyData.success || cancelled) return;
        const keys = keyData.data?.current_user_keys ?? [];
        if (cancelled) return;
        setUserKeys(
          keys.map((key) => ({ key, status: "pending", reason: "" })),
        );
        if (keys.length > 0) await verifyKeys(keys);
        if (isAdmin) await loadUsers();
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, isAdmin]);

  async function loadUserInfo() {
    try {
      const res = await fetch("/api/auth.php?action=check");
      const json = await res.json();
      const admin = !!json.data?.user?.is_admin;
      setIsAdmin(admin);
      if (json.data?.user?.id) setCurrentUserId(json.data.user.id);
      return admin;
    } catch {
      return false;
    }
  }

  async function loadUsers() {
    setUsersLoading(true);
    setUsersMsg(null);
    try {
      const res = await fetch("/api/settings.php?action=list-users");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setUsers(json.data || []);
    } catch (e) {
      setUsersMsg({ ok: false, text: e.message });
    } finally {
      setUsersLoading(false);
    }
  }

  /*
  async function handleCreateUser(e) {
    e.preventDefault();
    if (!newUserForm.username || !newUserForm.password) return;

    setCreatingUser(true);
    setCreateUserMsg(null);
    try {
      const res = await fetch("/api/settings.php?action=create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUserForm.username,
          password: newUserForm.password,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setCreateUserMsg({ ok: true, text: "User created successfully." });
      setNewUserForm({ username: "", password: "" });
      loadUsers(); // Reload users list
    } catch (e) {
      setCreateUserMsg({ ok: false, text: e.message });
    } finally {
      setCreatingUser(false);
    }
  }
  */

  async function verifyKeys(keys) {
    setKeysLoading(true);
    setKeysMsg(null);
    try {
      const res = await fetch("/api/settings.php?action=verify-my-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Verify failed");
      const results = json.data || [];
      setUserKeys(
        keys.map((k) => {
          const r = results.find((rx) => rx.key === k) || {};
          return {
            key: k,
            status: r.status || "error",
            reason: r.reason || "",
          };
        }),
      );
      setKeysMsg({ ok: true, text: `Verified ${results.length} key(s)` });
    } catch (e) {
      setKeysMsg({ ok: false, text: e.message });
    } finally {
      setKeysLoading(false);
    }
  }

  async function handleAddKey(e) {
    e?.preventDefault();
    const k = (newKeyInput || "").trim();
    if (k.length < 8) return setKeysMsg({ ok: false, text: "Key too short" });
    const newKeys = [...userKeys.map((u) => u.key), k];
    setNewKeyInput("");
    // save immediately and verify
    await saveKeysArray(newKeys);
  }

  function handleRemoveKey(index) {
    const newKeys = userKeys.filter((_, i) => i !== index).map((u) => u.key);
    // save immediately
    saveKeysArray(newKeys);
  }

  async function saveKeysArray(keys) {
    setKeysLoading(true);
    setKeysMsg(null);
    try {
      const res = await fetch("/api/settings.php?action=save-my-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      setKeysMsg({
        ok: true,
        text: `Saved ${json.data?.count ?? keys.length} key(s)`,
      });
      // re-verify saved keys and update UI
      await verifyKeys(keys);
      return { ok: true };
    } catch (e) {
      setKeysMsg({ ok: false, text: e.message });
      return { ok: false, error: e.message };
    } finally {
      setKeysLoading(false);
    }
  }

  /*
  async function handleChangePassword(e) {
    e.preventDefault();
    setPassLoading(true);
    setPassMsg(null);
    try {
      const res = await fetch("/api/auth.php?action=change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: curPass, new: newPass }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setPassMsg({ ok: true, text: "Password changed successfully." });
      setCurPass("");
      setNewPass("");
    } catch (e) {
      setPassMsg({ ok: false, text: e.message });
    } finally {
      setPassLoading(false);
    }
  }
  */

  return (
    <div className="settings-page max-w-2xl space-y-8 mx-auto">
      {/* ── API Keys ──────────────────────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-white text-lg">YouTube API Keys</h2>
        </div>

        {/* Per-user API key management (multiple keys) */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Your YouTube API Keys (you may add multiple)
          </label>

          <div className="mt-2 space-y-2">
            {userKeys.length === 0 && (
              <p className="text-sm text-gray-500">No keys saved.</p>
            )}

            {userKeys.map((u, idx) => {
              const meta = STATUS_META[u.status] || STATUS_META.error;
              const display =
                u.key.length > 12
                  ? `${u.key.slice(0, 8)}...${u.key.slice(-4)}`
                  : u.key;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 bg-gray-800/30 border border-gray-800 rounded-xl px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-xs text-gray-300">
                      {display}
                    </div>
                    <div
                      className={`text-xs px-2 py-1 rounded-xl border ${meta.bg} ${meta.color}`}
                    >
                      {meta.icon} {meta.label}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRemoveKey(idx)}
                      className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded-xl text-xs font-semibold text-white"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleAddKey}
            className="mt-3 flex gap-2 items-center"
          >
            <input
              type="text"
              value={newKeyInput}
              onChange={(e) => setNewKeyInput(e.target.value)}
              placeholder="Add new API key (AIz... )"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm text-white"
            >
              Add
            </button>
            <button
              onClick={async (e) => {
                e.preventDefault();
                const keys = userKeys.map((u) => u.key);
                await verifyKeys(keys);
              }}
              className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded-xl text-sm text-white"
            >
              {keysLoading ? "Verifying…" : "Verify"}
            </button>
          </form>

          {keysMsg && (
            <p
              className={`mt-2 text-sm px-3 py-2 rounded-xl border ${keysMsg.ok ? "text-green-800 bg-green-900/30 border-green-800" : "text-red-400 bg-red-900/30 border-red-800"}`}
            >
              {keysMsg.text}
            </p>
          )}
        </div>
      </section>

      {/* ── Change Password ───────────────────────────────────────────── */}
      {/*
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="font-semibold text-white text-lg mb-1">
          Change Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={curPass}
              onChange={(e) => setCurPass(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5
                         text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5
                         text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
            />
          </div>

          {passMsg && (
            <p
              className={`text-sm px-3 py-2 rounded-xl border
              ${
                passMsg.ok
                  ? "text-green-400 bg-green-900/30 border-green-800"
                  : "text-red-400 bg-red-900/30 border-red-800"
              }`}
            >
              {passMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={passLoading || !curPass || !newPass}
            className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 rounded-xl text-sm
                       font-semibold disabled:opacity-50 transition-colors"
          >
            {passLoading ? "Changing…" : "Change Password"}
          </button>
        </form>
      </section>
      */}

      {/* ── User Management (Admin Only) ───────────────────────────────────────── */}
      {false && (
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="font-semibold text-white text-lg mb-1">
            User Management
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Create new users and manage API keys.
          </p>

          {/* Create User Form */}
          {/*
          <div className="mb-8 p-4 bg-gray-800/50 border border-gray-800 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Create New User
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={newUserForm.username}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, username: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5
                             text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, password: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5
                             text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Minimum 6 characters"
                />
              </div>

              {createUserMsg && (
                <p
                  className={`text-sm px-3 py-2 rounded-xl border
                  ${
                    createUserMsg.ok
                      ? "text-green-400 bg-green-900/30 border-green-800"
                      : "text-red-400 bg-red-900/30 border-red-800"
                  }`}
                >
                  {createUserMsg.text}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  creatingUser || !newUserForm.username || !newUserForm.password
                }
                className="px-5 py-2.5 bg-green-700 hover:bg-green-600 rounded-xl text-sm
                           font-semibold disabled:opacity-50 transition-colors"
              >
                {creatingUser ? "Creating…" : "Create User"}
              </button>
            </form>
          </div>
          */}

          {/* Users List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              All Users
            </h3>

            {usersMsg && (
              <p
                className={`text-sm px-3 py-2 rounded-xl border mb-3
                ${
                  usersMsg.ok
                    ? "text-green-400 bg-green-900/30 border-green-800"
                    : "text-red-400 bg-red-900/30 border-red-800"
                }`}
              >
                {usersMsg.text}
              </p>
            )}

            {usersLoading ? (
              <p className="text-gray-500 text-sm">Loading users…</p>
            ) : users.length === 0 ? (
              <p className="text-gray-500 text-sm">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left px-3 py-2 font-semibold text-gray-300">
                        Username
                      </th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-300">
                        Admin
                      </th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-300">
                        Created
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-3 py-2 text-gray-300">
                          {user.username}
                        </td>
                        {/* API keys are managed per-user; not shown here */}
                        <td className="px-3 py-2">
                          {parseInt(user.is_admin) ? (
                            <span className="text-green-400 text-xs font-semibold">
                              ✓ Yes
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {user.id !== currentUserId && (
                            <div className="flex items-center gap-2 justify-end">
                              {/*
                              <button
                                onClick={async () => {
                                  const pwd = prompt(
                                    `Enter new password for ${user.username} (min 6 chars):`,
                                  );
                                  if (!pwd) return;
                                  if (pwd.length < 6)
                                    return alert(
                                      "Password must be at least 6 characters",
                                    );
                                  if (
                                    !confirm(
                                      `Change password for ${user.username}?`,
                                    )
                                  )
                                    return;
                                  try {
                                    const res = await fetch(
                                      "/api/settings.php?action=change-user-password",
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          id: user.id,
                                          password: pwd,
                                        }),
                                      },
                                    );
                                    const j = await res.json();
                                    if (!j.success)
                                      throw new Error(
                                        j.error || "Change failed",
                                      );
                                    alert("Password changed successfully.");
                                  } catch (e) {
                                    alert(e.message);
                                  }
                                }}
                                className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded-xl text-xs font-semibold text-white"
                              >
                                Change Password
                              </button>
                              */}

                              <button
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `Delete user ${user.username}? This will remove their account and API keys.`,
                                    )
                                  )
                                    return;
                                  try {
                                    const res = await fetch(
                                      `/api/settings.php?action=delete-user&id=${user.id}`,
                                      {
                                        method: "DELETE",
                                      },
                                    );
                                    const j = await res.json();
                                    if (!j.success)
                                      throw new Error(
                                        j.error || "Delete failed",
                                      );
                                    loadUsers();
                                  } catch (e) {
                                    alert(e.message);
                                  }
                                }}
                                className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded-xl text-xs font-semibold text-white"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
