<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

session_start();

$action = $_GET['action'] ?? '';

// ── GET /api/auth.php?action=check ───────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'check') {
    $authed = !empty($_SESSION['authed']);
    json_ok([
        'authed' => $authed,
        'user'   => $authed ? [
            'id'       => $_SESSION['user_id'] ?? null,
            'username' => $_SESSION['username'] ?? null,
            'is_admin' => !empty($_SESSION['is_admin']),
        ] : null,
    ]);
}

// ── POST /api/auth.php?action=login ─────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    $pass     = $_POST['password'] ?? '';
    $username = trim($_POST['username'] ?? '');
    
    $pdo = db();
    

    if ($username === '' || $pass === '') {
        json_err('Username and password are required', 400);
    }

    $user = find_user_by_username($pdo, $username);
    if (!$user) {
        if ($username === DEFAULT_USERNAME && password_verify($pass, DEFAULT_PASSWORD_HASH)) {
            $user = create_admin_user($pdo);
        } else {
            json_err('Invalid username or password', 401);
        }
    }

    if (!password_verify($pass, $user['password_hash'])) {
        json_err('Invalid username or password', 401);
    }

    $_SESSION['authed']    = true;
    $_SESSION['user_id']   = $user['id'];
    $_SESSION['username']  = $user['username'];
    $_SESSION['is_admin']  = (bool)$user['is_admin'];

    json_ok([
        'authed' => true,
        'user'   => [
            'id'       => $user['id'],
            'username' => $user['username'],
            'is_admin' => (bool)$user['is_admin'],
        ],
    ]);
}

// ── POST /api/auth.php?action=logout ──────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'logout') {
    session_destroy();
    json_ok(['authed' => false]);
}

// ── POST /api/auth.php?action=change-password ─────────────────────────────
/*
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'change-password') {
    if (empty($_SESSION['authed'])) json_err('Not authenticated', 401);
    $body    = json_decode(file_get_contents('php://input'), true) ?? [];
    $current = $body['current'] ?? '';
    $new     = $body['new'] ?? '';

    if (strlen($new) < 6) json_err('New password must be at least 6 characters');

    $pdo = db();
    $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id');
    $stmt->execute([':id' => $_SESSION['user_id']]);
    $hash = $stmt->fetchColumn();

    if (!$hash || !password_verify($current, $hash)) {
        json_err('Current password is wrong', 401);
    }

    $pdo->prepare('UPDATE users SET password_hash = :hash, updated_at = datetime(\'now\') WHERE id = :id')
        ->execute([':hash' => password_hash($new, PASSWORD_BCRYPT), ':id' => $_SESSION['user_id']]);

    json_ok(['changed' => true]);
}
*/

json_err('Unknown action', 400);

// ─────────────────────────────────────────────────────────────────────────────

function find_user_by_username(PDO $pdo, string $username): ?array {
    $stmt = $pdo->prepare('SELECT * FROM users WHERE username = :username LIMIT 1');
    $stmt->execute([':username' => $username]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function create_admin_user(PDO $pdo): array {
    $stmt = $pdo->prepare(
        'INSERT INTO users (username, password_hash, is_admin, created_at, updated_at) VALUES (:username, :hash, 1, datetime(\'now\'), datetime(\'now\'))'
    );
    $stmt->execute([
        ':username' => DEFAULT_USERNAME,
        ':hash'     => DEFAULT_PASSWORD_HASH,
    ]);
    $id = (int) $pdo->lastInsertId();
    return [
        'id'            => $id,
        'username'      => DEFAULT_USERNAME,
        'password_hash' => DEFAULT_PASSWORD_HASH,
        'is_admin'      => 1,
        'api_key'       => '',
    ];
}
