exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const apiKey = process.env.TRANSFERNOW_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing TRANSFERNOW_API_KEY" })
      };
    }

    const response = await fetch("https://api.transfernow.net/v1/transfers", {
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

    const data = await response.json();
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data?.message || "TransferNow API error", raw: data })
      };
    }

    const fileInfo = data.files[0];

    // Get presigned URLs for all parts
    const presignedRes = await fetch(
      `https://api.transfernow.net/v1/transfers/${data.transferId}/files/${fileInfo.id}/multipart-upload/${fileInfo.multipartUpload.uploadId}/presigned-urls`,
      {
        method: "GET",
        headers: { "x-api-key": apiKey, "x-sender-secret": data.senderSecret }
      }
    );

    const presignedData = await presignedRes.json();
    if (!presignedRes.ok) {
      return {
        statusCode: presignedRes.status,
        body: JSON.stringify({ error: "Failed to get presigned URLs", raw: presignedData })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        transferId: data.transferId,
        link: data.link,
        senderSecret: data.senderSecret,
        fileId: fileInfo.id,
        uploadId: fileInfo.multipartUpload.uploadId,
        parts: fileInfo.multipartUpload.parts,       // [{partNumber, start, size}]
        presignedUrls: presignedData                 // [{partNumber, url}]
      })
    };

  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
