# Media Management Pipeline — Sabr Studio

The diagram below illustrates the secure media upload workflow, highlighting the zero-disk memory buffering strategy, multi-tier MIME and magic-byte inspection, and streaming upload to Cloudinary.

```mermaid
flowchart TD
    subgraph Client["Admin Client (Browser)"]
        FilePick["User selects file in form<br/>(JPEG, PNG, WebP, AVIF)"]
        FormDataPrep["Pack into FormData<br/>field: 'file', optional: 'folder'"]
        UploadPost["POST /api/admin/uploads"]
    end

    subgraph MulterInspection["Multer Ingress Layer (upload.middleware.js)"]
        MemStorage["Multer memoryStorage()<br/>(Buffer held in RAM; zero disk I/O)"]
        SizeCheck{"File Size <= 4 MB?<br/>(MAX_UPLOAD_BYTES)"}
        CountCheck{"File Count === 1?<br/>Single part enforcement"}
        MimeCheck{"MIME Type in Whitelist?<br/>image/jpeg, png, webp, avif"}
    end

    subgraph MagicByteInspection["Deep Payload Inspection (detectImageType)"]
        InspectBuffer["Read first 12 bytes of memory buffer"]
        CheckSignatures{"Validate Magic Bytes"}
        SigJPEG["JPEG: FF D8 FF"]
        SigPNG["PNG: 89 50 4E 47 0D 0A 1A 0A"]
        SigWebP["WebP: RIFF .... WEBP"]
        SigAVIF["AVIF: .... ftyp avif|avis"]
        CompareMime{"Declared MIME === Magic Byte Format?"}
    end

    subgraph ControllerService["Upload Controller & Cloudinary Service"]
        FolderResolve["resolveFolder()<br/>projects -> sabrstudio/projects<br/>retail -> sabrstudio/retail"]
        GenPublicId["randomPublicId()<br/>Timestamp + 10 random hex bytes"]
        StreamUpload["cloudinary.uploader.upload_stream()<br/>Pipe buffer directly to Cloudinary"]
    end

    subgraph CloudinaryStorage["Persistent Cloud Storage"]
        CloudinaryCDN[("Cloudinary Asset Bucket<br/>(secure_url + public_id generated)")]
    end

    subgraph ErrorStates["Sanitized Error Responses"]
        Err413["413 Payload Too Large<br/>(UPLOAD_TOO_LARGE)"]
        Err400["400 Bad Request<br/>(UPLOAD_TOO_MANY_FILES / NO_FILE)"]
        Err415["415 Unsupported Media Type<br/>(UPLOAD_UNSUPPORTED_TYPE / INVALID_IMAGE)"]
        Err502["502 Bad Gateway<br/>(UPLOAD_FAILED)"]
        Err503["503 Service Unavailable<br/>(UPLOAD_NOT_CONFIGURED)"]
    end

    %% Flow connections
    FilePick --> FormDataPrep --> UploadPost
    UploadPost --> MemStorage

    MemStorage --> SizeCheck
    SizeCheck -->|> 4 MB| Err413
    SizeCheck -->|Valid| CountCheck

    CountCheck -->|> 1 file| Err400
    CountCheck -->|Valid| MimeCheck

    MimeCheck -->|Disallowed| Err415
    MimeCheck -->|Allowed| InspectBuffer

    InspectBuffer --> CheckSignatures
    CheckSignatures -->|No Match| Err415
    CheckSignatures -->|Matches| CompareMime

    CompareMime -->|Mismatch (Spoofed)| Err415
    CompareMime -->|Matched| FolderResolve

    FolderResolve --> GenPublicId
    GenPublicId --> StreamUpload
    StreamUpload --> CloudinaryStorage
    StreamUpload -->|Cloudinary Error| Err502

    CloudinaryStorage --> ReturnResponse["201 Created<br/>{ images: [ { url, publicId } ] }"]
    ReturnResponse --> FormDataPrep
```

---

### Security & Operational Guarantees

1. **Zero-Disk Architecture:** Essential for serverless runtimes (such as Vercel AWS Lambda) where the host file system is ephemeral and read-only.
2. **Anti-Extension-Spoofing:** A malicious executable or script renamed to `.jpg` is detected and blocked by the magic byte inspection engine before reaching external services.
3. **Randomized Public IDs:** Client file names are never stored or exposed; every image receives an unguessable pseudo-random identifier.
4. **Best-Effort Deletion:** When a project or product is updated with a replacement cover image or deleted, `deleteAsset` cleans up old assets on Cloudinary without failing the transaction if Cloudinary is temporarily unreachable.
