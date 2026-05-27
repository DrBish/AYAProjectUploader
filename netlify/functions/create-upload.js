exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const apiKey = process.env.TRANSFERNOW_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing TRANSFERNOW_API_KEY" }) };
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

    console.log("TransferNow response:", JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: data?.message || "API error", raw: data }) };
    }

    const fileInfo = data.files[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        transferId: data.transferId,
        link: data.link,
        fileId: fileInfo.id,
        uploadId: fileInfo.multipartUpload.uploadId,
        parts: fileInfo.multipartUpload.parts  // [{partNumber, start, size}]
      })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
