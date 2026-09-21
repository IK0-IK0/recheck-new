<?php

namespace App\Services;

use Ilovepdf\Ilovepdf;

class IlovePdfService
{
    public function detectForms(string $filePath, string $publicKey, string $secretKey): string
    {
        $api = new Ilovepdf($publicKey, $secretKey);
        $task = $api->newTask('formsdetect');
        $task->addFile($filePath);

        $task->execute();

        return $task->blob();
    }
}
