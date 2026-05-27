exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    // Validate required fields
    if (!body.fileName || !body.fileSize || !body.fileData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing fileName, fileSize, or fileData" })
      };
    }

    const apiKey = process.env.TRANSFERNOW_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing TRANSFERNOW_API_KEY" })
      };
    }

    // ── STEP 1: Create the transfer ──────────────────────────────────────────
    const createRes = await fetch("https://api.transfernow.net/v1/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        langCode: "en",
        files: [{ name: body.fileName, size: body.fileSize }],
        message: body.message || "Student upload",
        subject: body.subject || "Submission",
        toEmails: body.email ? [body.email] : []
      })
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      return {
        statusCode: createRes.status,
        body: JSON.stringify({ error: "Transfer creation failed", raw: createData })
      };
    }

    const { transferId, senderSecret, link, files } = createData;
    const fileInfo = files[0];
    const { multipartUpload, id: fileId } = fileInfo;
    const { uploadId, parts } = multipartUpload;

    // ── STEP 2: Get presigned URLs for each part ─────────────────────────────
    const presignedRes = await fetch(
      `https://api.transfernow.net/v1/transfers/${transferId}/files/${fileId}/multipart-upload/${uploadId}/presigned-urls`,
      {
        method: "GET",
        headers: { "x-api-key": apiKey, "x-sender-secret": senderSecret }
      }
    );

    const presignedData = await presignedRes.json();
    if (!presignedRes.ok) {
      return {
        statusCode: presignedRes.status,
        body: JSON.stringify({ error: "Failed to get presigned URLs", raw: presignedData })
      };
    }

    // presignedData should be an array of { partNumber, url }
    const presignedUrls = presignedData; // adjust if nested e.g. presignedData.parts

    // ── STEP 3: Upload each chunk to S3 ──────────────────────────────────────
    // fileData should be base64-encoded on the client side
    const fileBuffer = Buffer.from(body.fileData, "base64");
    const eTags = [];

    for (const part of parts) {
      const chunk = fileBuffer.slice(part.start, part.start + part.size);
      const urlEntry = presignedUrls.find(p => p.partNumber === part.partNumber);

      if (!urlEntry) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `No presigned URL for part ${part.partNumber}` })
        };
      }

      const uploadRes = await fetch(urlEntry.url, {
        method: "PUT",
        body: chunk,
        headers: { "Content-Type": "application/octet-stream" }
      });

      if (!uploadRes.ok) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Failed to upload part ${part.partNumber}` })
        };
      }

      const eTag = uploadRes.headers.get("ETag");
      eTags.push({ partNumber: part.partNumber, eTag });
    }

    // ── STEP 4: Complete the multipart upload ─────────────────────────────────
    const completeRes = await fetch(
      `https://api.transfernow.net/v1/transfers/${transferId}/files/${fileId}/multipart-upload/${uploadId}/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "x-sender-secret": senderSecret
        },
        body: JSON.stringify({ parts: eTags })
      }
    );

    if (!completeRes.ok) {
      const err = await completeRes.json();
      return {
        statusCode: completeRes.status,
        body: JSON.stringify({ error: "Multipart complete failed", raw: err })
      };
    }

    // ── STEP 5: Finalize the transfer ─────────────────────────────────────────
    const finalizeRes = await fetch(
      `https://api.transfernow.net/v1/transfers/${transferId}/finalize`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "x-sender-secret": senderSecret
        }
      }
    );

    if (!finalizeRes.ok) {
      const err = await finalizeRes.json();
      return {
        statusCode: finalizeRes.status,
        body: JSON.stringify({ error: "Finalize failed", raw: err })
      };
    }

    // ── STEP 6: Return the download link ──────────────────────────────────────
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        transferId,
        link,
        senderSecret
      })
    };

  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
