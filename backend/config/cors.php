<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://task.cryptotrekkers.in',  // ✅ ADD THIS
    'https://www.cryptotrekkers.in',   // ✅ ADD if needed
],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];