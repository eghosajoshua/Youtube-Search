<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (PHP_SAPI !== 'cli') {
    if (empty($_SESSION['authed'])) json_err('Not authenticated', 401);
}

$method = $_SERVER['REQUEST_METHOD'] ?? null;
$action = $_GET['action'] ?? '';

$currentUser = null;

if (!empty($_SESSION['authed'])) {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT id, username, is_admin FROM users WHERE id = :id');
    $stmt->execute([':id' => $_SESSION['user_id']]);
    $currentUser = $stmt->fetch();
}

function require_admin(): void {
    if (empty($_SESSION['authed']) || empty($_SESSION['is_admin'])) {
        json_err('Admin access required', 403);
    }
}

// ── GET /api/settings.php?action=get ─────────────────────────────────────
if ($method === 'GET' && $action === 'get') {
    $pdo = db();
    $map = [];
    if ($currentUser) {
        $map['current_user'] = [
            'id'       => $currentUser['id'],
            'username' => $currentUser['username'],
            'is_admin' => (bool)$currentUser['is_admin'],
        ];
    }
    // Include per-user keys list
    if ($currentUser) {
        $stmt = $pdo->prepare('SELECT api_key FROM user_api_keys WHERE user_id = :id ORDER BY id ASC');
        $stmt->execute([':id' => $currentUser['id']]);
        $keys = array_map(fn($r) => $r['api_key'], $stmt->fetchAll());
        $map['current_user_keys'] = $keys;
    }
    json_ok($map);
}

// ── GET /api/settings.php?action=list-users ──────────────────────────────
if ($method === 'GET' && $action === 'list-users') {
    require_admin();
    $users = db()->query('SELECT id, username, is_admin, created_at, updated_at FROM users ORDER BY created_at DESC')->fetchAll();
    json_ok($users);
}

// ── POST /api/settings.php?action=create-user ────────────────────────────
/*
if ($method === 'POST' && $action === 'create-user') {
    require_admin();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    if ($username === '' || strlen($password) < 6) {
        json_err('Username and password are required; password must be at least 6 characters', 400);
    }

    $pdo = db();
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE username = :username');
    $stmt->execute([':username' => $username]);
    if ((int) $stmt->fetchColumn() > 0) {
        json_err('Username already exists', 409);
    }

    $pdo->prepare(
        'INSERT INTO users (username, password_hash, is_admin, created_at, updated_at)
         VALUES (:username, :hash, 0, datetime(\'now\'), datetime(\'now\'))'
    )->execute([
        ':username' => $username,
        ':hash'     => password_hash($password, PASSWORD_BCRYPT),
    ]);

    json_ok(['created' => true]);
}
*/

// ── POST /api/settings.php?action=save-my-keys ───────────────────────────
if ($method === 'POST' && $action === 'save-my-keys') {
    if (empty($_SESSION['authed'])) json_err('Not authenticated', 401);
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $keys = array_values(array_filter(array_map('trim', $body['keys'] ?? []), fn($k) => strlen($k) > 8));

    $pdo = db();
    $pdo->beginTransaction();
    // remove existing keys
    $pdo->prepare('DELETE FROM user_api_keys WHERE user_id = :uid')->execute([':uid' => $_SESSION['user_id']]);
    $stmt = $pdo->prepare('INSERT INTO user_api_keys (user_id, api_key, created_at) VALUES (:uid, :key, datetime(\'now\'))');
    foreach ($keys as $k) {
        $stmt->execute([':uid' => $_SESSION['user_id'], ':key' => $k]);
    }
    $pdo->commit();
    json_ok(['saved' => true, 'count' => count($keys)]);
}

// ── POST /api/settings.php?action=verify-my-keys ─────────────────────────
if ($method === 'POST' && $action === 'verify-my-keys') {
    if (empty($_SESSION['authed'])) json_err('Not authenticated', 401);
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $keys = $body['keys'] ?? null;
    if ($keys === null) {
        $pdo = db();
        $stmt = $pdo->prepare('SELECT api_key FROM user_api_keys WHERE user_id = :uid ORDER BY id ASC');
        $stmt->execute([':uid' => $_SESSION['user_id']]);
        $keys = array_map(fn($r) => $r['api_key'], $stmt->fetchAll());
    }
    $results = [];
    foreach ($keys as $key) $results[] = verify_yt_key(trim($key));
    json_ok($results);
}


// ── POST/DELETE /api/settings.php?action=delete-user ───────────────────────
if (($method === 'POST' || $method === 'DELETE') && $action === 'delete-user') {
    require_admin();

    // Accept id in query or JSON body
    $id = null;
    if (isset($_GET['id'])) $id = (int) $_GET['id'];
    else {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = isset($body['id']) ? (int)$body['id'] : null;
    }

    if (!$id) json_err('id required', 400);

    $pdo = db();
    $stmt = $pdo->prepare('SELECT id, username, is_admin FROM users WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();
    if (!$user) json_err('User not found', 404);

    // Prevent deleting the seeded main admin
    if ($user['username'] === DEFAULT_USERNAME) json_err('Cannot delete main admin', 403);

    // Prevent deleting yourself
    if (!empty($_SESSION['user_id']) && (int)$_SESSION['user_id'] === (int)$id) {
        json_err('Cannot delete yourself', 403);
    }

    // Delete user and any API-key rows through the foreign-key cascade.
    $pdo->prepare('DELETE FROM users WHERE id = :id')->execute([':id' => $id]);
    json_ok(['deleted' => true]);
}

// ── POST /api/settings.php?action=change-user-password ─────────────────────
/*
if ($method === 'POST' && $action === 'change-user-password') {
    require_admin();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = isset($body['id']) ? (int)$body['id'] : null;
    $password = isset($body['password']) ? $body['password'] : '';

    if (!$id) json_err('id required', 400);
    if (strlen($password) < 6) json_err('Password must be at least 6 characters', 400);

    $pdo = db();
    $stmt = $pdo->prepare('SELECT id, username FROM users WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();
    if (!$user) json_err('User not found', 404);

    // Prevent changing seeded main admin password via this endpoint
    if ($user['username'] === DEFAULT_USERNAME) json_err('Cannot change main admin password', 403);

    $pdo->prepare('UPDATE users SET password_hash = :hash, updated_at = datetime(\'now\') WHERE id = :id')
        ->execute([':hash' => password_hash($password, PASSWORD_BCRYPT), ':id' => $id]);

    json_ok(['changed' => true]);
}
*/

// ─────────────────────────────────────────────────────────────────────────────

function upsert_setting(string $key, mixed $value): void {
    $pdo  = db();
    $pdo->prepare(
        'INSERT OR REPLACE INTO app_settings (skey, svalue, updated_at)
         VALUES (:k, :v, datetime(\'now\'))'
    )->execute([':k' => $key, ':v' => json_encode($value)]);
}

function verify_yt_key(string $key): array {
    if (strlen($key) < 10) {
        return ['key' => $key, 'status' => 'invalid', 'reason' => 'Key too short'];
    }

    $url = YT_API_BASE . '/videos?' . http_build_query([
        'part'       => 'id',
        'chart'      => 'mostPopular',
        'maxResults' => 1,
        'key'        => $key,
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
    ]);
    $body = curl_exec($ch);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($err) return ['key' => $key, 'status' => 'error', 'reason' => "cURL: $err"];

    $data   = json_decode($body, true);
    if (!isset($data['error'])) {
        return ['key' => $key, 'status' => 'ok', 'reason' => 'Working'];
    }

    $code   = $data['error']['code']              ?? 0;
    $errors = $data['error']['errors']             ?? [];
    $reason = $errors[0]['reason']                 ?? '';
    $msg    = $data['error']['message']            ?? 'Unknown error';

    if ($code === 403 && in_array($reason, ['quotaExceeded','dailyLimitExceeded'], true)) {
        return ['key' => $key, 'status' => 'quota',   'reason' => 'Daily quota exhausted'];
    }
    if ($code === 400 && $reason === 'keyInvalid') {
        return ['key' => $key, 'status' => 'invalid', 'reason' => 'Invalid API key'];
    }
    if ($code === 403 && $reason === 'accessNotConfigured') {
        return ['key' => $key, 'status' => 'invalid', 'reason' => 'YouTube Data API not enabled for this key'];
    }

    return ['key' => $key, 'status' => 'error', 'reason' => $msg];
}

function get_user_keys(PDO $pdo, int $userId): array {
    $stmt = $pdo->prepare('SELECT api_key FROM user_api_keys WHERE user_id = :uid ORDER BY id ASC');
    $stmt->execute([':uid' => $userId]);
    return array_map(fn($r) => $r['api_key'], $stmt->fetchAll());
}

function get_user_key_index(PDO $pdo, int $userId): int {
    $stmt = $pdo->prepare('SELECT svalue FROM app_settings WHERE skey = :k');
    $stmt->execute([':k' => 'user_key_index_' . $userId]);
    $val = $stmt->fetchColumn();
    return $val === false ? 0 : (int)json_decode($val);
}

function set_user_key_index(PDO $pdo, int $userId, int $nextIndex): void {
    upsert_setting('user_key_index_' . $userId, $nextIndex);
}

function get_user_key_order(PDO $pdo, int $userId): array {
    $keys = get_user_keys($pdo, $userId);
    $count = count($keys);
    if ($count === 0) {
        return [];
    }
    $start = get_user_key_index($pdo, $userId) % $count;
    return array_merge(array_slice($keys, $start), array_slice($keys, 0, $start));
}

function is_yt_error_retryable(array $error): bool {
    $code = $error['code'] ?? 0;
    $reason = $error['errors'][0]['reason'] ?? '';
    return ($code === 403 && in_array($reason, ['quotaExceeded', 'dailyLimitExceeded'], true))
        || ($code === 400 && $reason === 'keyInvalid')
        || ($code === 403 && $reason === 'accessNotConfigured');
}

