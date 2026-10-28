<?php
$db = new PDO("sqlite:database.db");

// Load schema file
$sql = file_get_contents("schema.sql");

// Execute it
$db->exec($sql);

echo "Database created successfully";