---
description: "Use when implementing or changing file uploads, attachments, S3 or other remote storage, presigned URLs, or browser-to-storage transfers."
---

# File Upload Guidance

- For S3-compatible remote storage, upload file bytes directly from the browser to storage with a short-lived presigned URL. Do not proxy the file through the Laravel application server.
- Follow the existing Document Management flow: an authenticated endpoint validates the request and returns a presigned upload URL and storage path; the browser uploads with `XMLHttpRequest` so progress and failures can be reported; a completion endpoint verifies the stored object before creating database records.
- Keep metadata and file bytes separate. The server must validate ownership, storage path scope, file size/type, and any workflow associations before issuing the URL and again before attaching the uploaded object.
- Keep storage credentials on the server. Never send secrets to the browser.
- Use the existing non-remote-storage flow for local disks; do not force local uploads through an S3-specific presigned flow.
- Preserve user-visible errors and upload progress. Do not report success until the completion endpoint confirms the object and its database association are saved.
- Before adding another upload flow, inspect and reuse the established Document Management pattern and its helpers/endpoints where practical.
