<?php
/**
 * Run this from your terminal when you forget your password:
 *   php reset-password.php
 *
 * It will prompt you for a new password and save it immediately.
 * No old password required.
 */

/* Password change disabled.
if (php_sapi_name() !== 'cli') {
    die("This script must be run from the terminal.\n");
}

require_once __DIR__ . '/api/db.php'; // loads config and provides db()

echo "\nYouTube Search - Password Reset\n";
echo str_repeat('─', 38) . "\n\n";

// Prompt for username (default: DEFAULT_USERNAME)
$username = prompt("Enter username to reset (leave empty for '" . DEFAULT_USERNAME . "'): ", DEFAULT_USERNAME);
echo "\n";

// Prompt for new password (hidden input on Unix, visible fallback on Windows)
$new = prompt_password("Enter new password (min 6 chars): ");
echo "\n";

if (strlen($new) < 6) {
    echo "Password too short. Must be at least 6 characters.\n\n";
    exit(1);
}

$confirm = prompt_password("Confirm new password: ");
echo "\n";

if ($new !== $confirm) {
    echo "Passwords do not match.\n\n";
    exit(1);
}

$hash = password_hash($new, PASSWORD_BCRYPT);

$pdo = db();

// Ensure users table exists (db() will create DB and schema if needed)
$stmt = $pdo->prepare('SELECT id FROM users WHERE username = :username LIMIT 1');
$stmt->execute([':username' => $username]);
$id = $stmt->fetchColumn();

if ($id) {
    $pdo->prepare('UPDATE users SET password_hash = :hash, updated_at = datetime(\'now\') WHERE id = :id')
        ->execute([':hash' => $hash, ':id' => $id]);
    echo "Password for user '" . $username . "' updated successfully.\n\n";
} else {
    echo "User '" . $username . "' not found. No changes made.\n\n";
    echo "Hint: run this script for an existing username only.\n\n";
    exit(1);
}

echo "You can now log in with the new password.\n\n";
*/

// ─────────────────────────────────────────────────────────────────────────────

function prompt_password(string $prompt): string {
    echo $prompt;

    // Unix: hide input with stty
    if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
        $old = shell_exec('stty -g');
            system('stty -echo');
            $pass = rtrim(fgets(STDIN), "\r\n");
        system('stty ' . trim($old));
        return $pass;
    }

    // Windows fallback — input visible
    return rtrim(fgets(STDIN), "\r\n");
}

function prompt(string $prompt, string $default = ''): string {
    echo $prompt;
    $input = rtrim(fgets(STDIN), "\r\n");
    return $input === '' ? $default : $input;
}