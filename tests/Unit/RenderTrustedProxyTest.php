<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;

test('Render forwarded HTTPS headers produce secure asset URLs', function (): void {
    $application = require dirname(__DIR__, 2).'/bootstrap/app.php';
    $application->make(Kernel::class);

    $request = Request::create(
        'http://recheck-new.onrender.com/',
        'GET',
        [],
        [],
        [],
        [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_X_FORWARDED_PORT' => '443',
        ],
    );

    (new TrustProxies($application))->handle($request, fn (): null => null);

    expect($request->isSecure())->toBeTrue()
        ->and($request->getSchemeAndHttpHost())->toBe('https://recheck-new.onrender.com');
});
