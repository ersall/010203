exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    const adminPass = process.env.ADMIN_PASS || "default123";

    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch(e) {}

    if (String(body.pass || "") !== adminPass) {
        return { statusCode: 403, body: "bad_pass" };
    }

    const name = String(body.name || "User");
    const ttl = parseInt(body.ttl) || 300;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const codeData = JSON.stringify({
        name,
        createdAt: Date.now(),
        expiresAt: Date.now() + ttl * 1000
    });

    await fetch(`${url}/set/code:${code}/${encodeURIComponent(codeData)}?EX=${ttl}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    return {
        statusCode: 200,
        body: JSON.stringify({ code, name, expiresIn: ttl })
    };
};
