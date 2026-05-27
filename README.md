# Project Uploader

Can be used for direct student upload of projects with metadata and aknowledged consent which are ultimately stored in *Sharepoint* for review and forward sharing. 

## POC Design

```
Netlify Form
    ↓
*TransferNow Upload API
    ↓
*TransferNow returns transfer ID / URLs
    ↓
Metadata + transfer reference saved
    ↓
Automation retrieves files
    ↓
Move into SharePoint / Windows system
```

**TransferNow* is temporary upload engine to be swapped for *AWS* blob storage later  
**TransferNow* requires use of *Netlify* functions to send request from server (with API Key as environment variable) rather than browser
