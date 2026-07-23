<?php

use App\Models\Action;
use App\Models\Permission;
use App\Models\Phase;
use App\Models\Process;
use App\Models\Role;
use App\Models\TenantUser;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

// ---------------------------------------------------------------------------
// Role relationships — BelongsToMany
// ---------------------------------------------------------------------------

test('Role::users() returns a BelongsToMany of TenantUser', function () {
    $role = Role::factory()->create();

    expect($role->users())->toBeInstanceOf(BelongsToMany::class);
    expect($role->users()->getRelated())->toBeInstanceOf(TenantUser::class);
});

test('Role::permissions() returns a BelongsToMany of Permission', function () {
    $role = Role::factory()->create();

    expect($role->permissions())->toBeInstanceOf(BelongsToMany::class);
    expect($role->permissions()->getRelated())->toBeInstanceOf(Permission::class);
});

test('Role users relationship syncs correctly with TenantUser factory', function () {
    $role = Role::factory()->create();
    $users = TenantUser::factory()->count(2)->create();

    $role->users()->sync($users->pluck('id'));

    expect($role->users)->toHaveCount(2);
    expect($role->users->first())->toBeInstanceOf(TenantUser::class);
});

test('Role permissions relationship syncs correctly with Permission factory', function () {
    $role = Role::factory()->create();
    $permissions = Permission::factory()->count(3)->create();

    $role->permissions()->sync($permissions->pluck('id'));

    expect($role->permissions)->toHaveCount(3);
    expect($role->permissions->first())->toBeInstanceOf(Permission::class);
});

// ---------------------------------------------------------------------------
// Process → Phase → Action chain — HasMany
// ---------------------------------------------------------------------------

test('Process::phases() returns a HasMany of Phase', function () {
    $process = Process::factory()->create();

    expect($process->phases())->toBeInstanceOf(HasMany::class);
    expect($process->phases()->getRelated())->toBeInstanceOf(Phase::class);
});

test('Phase::actions() returns a HasMany of Action', function () {
    $phase = Phase::factory()->create();

    expect($phase->actions())->toBeInstanceOf(HasMany::class);
    expect($phase->actions()->getRelated())->toBeInstanceOf(Action::class);
});

test('Process::hasMany(Phase) returns correct related phases via factory', function () {
    $process = Process::factory()->create();
    Phase::factory()->count(3)->for($process)->create();

    $phases = $process->phases()->get();

    expect($phases)->toHaveCount(3);
    expect($phases->every(fn ($p) => $p instanceof Phase))->toBeTrue();
    expect($phases->every(fn ($p) => $p->process_id === $process->id))->toBeTrue();
});

test('Phase::hasMany(Action) returns correct related actions via factory', function () {
    $phase = Phase::factory()->create();
    Action::factory()->count(4)->for($phase)->create();

    $actions = $phase->actions()->get();

    expect($actions)->toHaveCount(4);
    expect($actions->every(fn ($a) => $a instanceof Action))->toBeTrue();
    expect($actions->every(fn ($a) => $a->phase_id === $phase->id))->toBeTrue();
});
