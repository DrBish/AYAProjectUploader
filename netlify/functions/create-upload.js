exports.handler = async (event) => {

  try {

    const body = JSON.parse(event.body || "{}");

    // ✅ Validate API key FIRST
    const apiKey = process.env.TRANSFERNOW_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing TRANSFERNOW_API_KEY in environment variables"
        })
      };
    }

    // CALL TRANSFERNOW
    const response = await fetch("https://api.transfernow.net/v1/transfers", {
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
        message: "Student upload",
        subject: "Submission",
        toEmails: body.email ? [body.email] : []
      })
    });

    const text = await response.text();

    console.log("Status:", response.status);
    console.log("Body:", text);

    if (!text) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Empty response from TransferNow"
        })
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Non-JSON response from TransferNow",
          raw: text
        })
      };
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data?.message || "TransferNow API error",
          raw: data
        })
      };
    }

    // Extract upload URL (adjust if API differs)
    const uploadUrl = data?.files?.[0]?.upload_url;

    if (!uploadUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "No upload URL returned",
          raw: data
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        uploadUrl
      })
    };

  } catch (err) {

    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};
