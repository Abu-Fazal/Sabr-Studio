# CMS & Dynamic Detail Blocks Workflow — Sabr Studio

The diagram below details the architecture and data lifecycle of the dynamic Project CMS, from the administrative visual block editor (`DetailBlocksEditor.jsx`) to backend schema normalization, MongoDB storage, and public rendering (`ProjectDetail.jsx`).

```mermaid
flowchart TD
    subgraph AdminUI["Admin Dashboard (DetailBlocksEditor.jsx)"]
        AddBlock["Admin Adds Content Block<br/>(palette | keywords | lists | sections | imageBlocks)"]
        EditBlock["Configure Block Payload & Tokens<br/>(Heading, Text, URL, Align, Width, Aspect)"]
        DragDrop["Canvas Arrangement<br/>(Assign place.rowId & place.col)"]
        SubmitForm["Save Project Form<br/>(PUT/POST /api/admin/projects/:id)"]
    end

    subgraph BackendIngress["Backend API Ingress (apiHandler.js)"]
        AdminRateLimit["adminLimiter (50 req / 15 min prod)"]
        AdminProtect["protect.middleware.js (Verify Admin JWT)"]
        ProjectValidator["project.validator.js<br/>(Schema & Detail Block Verification)"]
    end

    subgraph ServiceNormalization["Service Normalization (project.service.js)"]
        SpecValidator["detailBlockSpec.js Rules Engine"]
        CleanPlace["normalizeBlockPlace()<br/>Clamp col to 0..2; validate rowId"]
        CleanStyle["normalizeBlockStyle()<br/>Whitelist alignments, widths, fonts, colors"]
        CleanPayload["Type-Specific Payload Normalization<br/>(Discard unauthorized keys)"]
    end

    subgraph Database["Database Persistence (MongoDB Atlas)"]
        MongoSave[("Project Document<br/>detailBlocks: [ { id, type, order, place, style, ... } ]")]
    end

    subgraph PublicServing["Public Website (sabrstudio.in)"]
        PublicReq["Public Visitor Navigates to /projects/:slug"]
        FetchProject["GET /api/projects/:slug (Public API)"]
        RowGrouper["groupBlocksIntoRows()<br/>Group by place.rowId and bucket into columns"]
        BlockRenderer["DetailBlockContent.jsx<br/>(Render responsive CSS grid & Tailwind classes)"]
    end

    %% Workflow Flow
    AddBlock --> EditBlock
    EditBlock --> DragDrop
    DragDrop --> SubmitForm

    SubmitForm --> AdminRateLimit
    AdminRateLimit --> AdminProtect
    AdminProtect --> ProjectValidator

    ProjectValidator --> SpecValidator
    SpecValidator --> CleanPlace
    SpecValidator --> CleanStyle
    SpecValidator --> CleanPayload
    CleanPayload --> MongoSave

    MongoSave --> FetchProject
    PublicReq --> FetchProject
    FetchProject --> RowGrouper
    RowGrouper --> BlockRenderer
```

---

### Detail Block Type Definitions

1. **`palette`**: Architectural material color swatches with name, hex/rgb values, and descriptions.
2. **`keywords`**: Key design descriptors and conceptual tags grouped under a section heading.
3. **`lists`**: Structured design criteria with intro paragraphs and bulleted or numbered items.
4. **`sections`**: Long-form editorial narratives with headings, intro passages, and multiple body paragraphs.
5. **`imageBlocks`**: Visual showcases supporting Cloudinary URLs, captions, subheadings, and bespoke layouts.
