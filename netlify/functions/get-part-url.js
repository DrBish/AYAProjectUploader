exports.handler = async (event) => {
  const { transferId, fileId, partNumber, uploadId } = event.queryStringParameters;
  const apiKey = process.env.TRANSFERNOW_API_KEY;

  const res = await fetch(
    `https://api.transfernow.net/v1/transfers/${transferId}/files/${fileId}/parts/${partNumber}?uploadId=${uploadId}`,
    { headers: { "x-api-key": apiKey } }
  );

  const data = await res.json();
  return { statusCode: res.status, body: JSON.stringify(data) };
};
