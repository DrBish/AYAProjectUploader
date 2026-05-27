exports.handler = async (event) => {
  try {
    const { transferId, fileId, uploadId } = JSON.parse(event.body || "{}");
    const apiKey = process.env.TRANSFERNOW_API_KEY;
    const encodedUploadId = encodeURIComponent(uploadId);

    // Complete the file upload
    const fileRes = await fetch(
      `https://api.transfernow.net/v1/transfers/${transferId}/files/${fileId}/upload-done?uploadId=${encodedUploadId}`,
      { method: "PUT", headers: { "x-api-key": apiKey } }
    );
    if (!fileRes.ok) {
      const err = await fileRes.json().catch(() => ({}));
      return { statusCode: fileRes.status, body: JSON.stringify({ error: "File complete failed", raw: err }) };
    }

    // Complete the transfer
    const transferRes = await fetch(
      `https://api.transfernow.net/v1/transfers/${transferId}/upload-done`,
      { method: "PUT", headers: { "x-api-key": apiKey } }
    );
    if (!transferRes.ok) {
      const err = await transferRes.json().catch(() => ({}));
      return { statusCode: transferRes.status, body: JSON.stringify({ error: "Transfer complete failed", raw: err }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
