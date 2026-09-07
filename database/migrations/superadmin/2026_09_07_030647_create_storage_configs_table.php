<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('storage_configs', function (Blueprint $table) {
            $table->id();
            $table->string('driver')->default('local'); // local, public, s3, supabase
            $table->string('root')->nullable(); // for local/public
            $table->text('endpoint')->nullable(); // for s3/supabase
            $table->string('region')->nullable(); // for s3/supabase
            $table->string('bucket')->nullable(); // for s3/supabase
            $table->text('access_key')->nullable(); // encrypted
            $table->text('secret_key')->nullable(); // encrypted
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('storage_configs');
    }
};
