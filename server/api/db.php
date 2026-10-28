<?php
require_once __DIR__ . '/config.php';

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dbFile = __DIR__ . '/../database.db';
        $pdo = new PDO('sqlite:' . $dbFile, null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        // Enable WAL mode for better concurrent read/write performance
        $pdo->exec('PRAGMA journal_mode=WAL');
        // Enforce foreign keys (SQLite ignores them by default)
        $pdo->exec('PRAGMA foreign_keys=ON');

        // Auto-create tables if database.db is brand new
        $schema = __DIR__ . '/../db/schema.sql';
        if (file_exists($schema)) {
            $pdo->exec(file_get_contents($schema));
        }
    }
    return $pdo;
}

// `migrate_schema` removed: using single `db/schema.sql` and one-time migration script.

function table_has_column(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->prepare("PRAGMA table_info($table)");
    $stmt->execute();
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if ($row['name'] === $column) {
            return true;
        }
    }
    return false;
}

function ensure_column(PDO $pdo, string $table, string $column, string $definition): void {
    if (!table_has_column($pdo, $table, $column)) {
        $pdo->exec("ALTER TABLE $table ADD COLUMN $column $definition");
    }
}