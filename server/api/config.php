<?php
// ─── YouTube ───────────────────────────────────────────────────────────────
define('YT_API_BASE', 'https://www.googleapis.com/youtube/v3');


// ── Default login password ─────────────────────────────────────────────────
// Change this to any bcrypt hash. To generate a new hash run:
//   php -r "echo password_hash('your_password', PASSWORD_BCRYPT);"
//
// Default password is: admin123
define('DEFAULT_PASSWORD_HASH', '$2y$10$tedEDGaSJKmVgC8vFiwJGeFrS6Mbr7JzRGH5iJXXoodzbUyIz1HpC');
define('DEFAULT_USERNAME', 'admin');


// ─── App ───────────────────────────────────────────────────────────────────
define('APP_NAME', 'YouTube Search');
define('APP_URL', 'http://localhost:5173');

