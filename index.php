<?php
declare(strict_types=1);

// Redirect root PHP request to the main HTML entry point.
header('Location: index.html', true, 302);
exit;
