exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    // Check API key
    const apiKey = process.env.TRANSFERNOW_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing TRANSFERNOW_API_KEY in Netlify environment variables"
        })
      };
    }

    // Create transfer
    const response = await fetch(
      "https://api.transfernow.net/v1/transfers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          langCode: "en",
          files: [
            {
              name: body.fileName,
              size: body.fileSize
            }
          ],
          message: body.message || "Student upload",
          subject: body.subject || "Submission",
          toEmails: body.email ? [body.email] : []
        })
      }
    );

    const text = await response.text();

    console.log("TransferNow status:", response.status);
    console.log("TransferNow raw response:", text);

    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "TransferNow returned invalid JSON",
          raw: text
        })
      };
    }

    // Handle API errors
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data?.message || "TransferNow API error",
          raw: data
        })
      };
    }

    // Success: return useful values
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        transferId: data.transferId,
        link: data.link,
        senderSecret: data.senderSecret,
        file: data.files?.[0] || null
      })
    };

  } catch (err) {
    console.error("Function error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};
