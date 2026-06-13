exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch(e) {}

    const code = String(body.code || "").trim();

    if (!code || code.length !== 6) {
        return { statusCode: 400, body: "Invalid code" };
    }

    const r = await fetch(`${url}/get/code:${code}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();

    if (!data.result) {
        return { statusCode: 401, body: "Invalid or expired code" };
    }

    let codeData;
    try { codeData = JSON.parse(data.result); } catch(e) {
        return { statusCode: 500, body: "Error" };
    }

    if (Date.now() > codeData.expiresAt) {
        await fetch(`${url}/del/code:${code}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { statusCode: 401, body: "Code expired" };
    }

    await fetch(`${url}/del/code:${code}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    // Сохраняем ключ доступа (для отзыва)
    const accessKey = `access:${codeData.name}`;
    const accessData = JSON.stringify({
        name: codeData.name,
        createdAt: Date.now(),
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000
    });
    await fetch(`${url}/set/${accessKey}/${encodeURIComponent(accessData)}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, name: codeData.name })
    };
};
