exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const response = await fetch("https://api.transfernow.net/v1/transfers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.TRANSFERNOW_API_KEY
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
        toEmails: [body.email]
      })
    });

const text = await response.text();

console.log("TransferNow raw response:", text);

let data;
try {
  data = JSON.parse(text);
} catch (e) {
  throw new Error("TransferNow did not return JSON: " + text);
}

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data.message || "TransferNow API error"
        })
      };
    }

    const uploadUrl = data?.files?.[0]?.upload_url;

    if (!uploadUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "No uploadUrl returned from TransferNow"
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
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};