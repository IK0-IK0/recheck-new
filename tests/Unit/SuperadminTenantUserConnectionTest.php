<?php

use App\Models\SuperadminTenantUser;

test('superadmin tenant users do not pin themselves to a database connection', function (): void {
    expect((new SuperadminTenantUser)->getConnectionName())->toBeNull();
});
