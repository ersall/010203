exports.handler = async (event) => {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    const cookie = event.headers.cookie || '';
    const nameMatch = cookie.match(/access_name=([^;]+)/);
    const name = nameMatch ? decodeURIComponent(nameMatch[1]) : null;

    if (!name) {
        return { statusCode: 200, body: JSON.stringify({ hasAccess: false }) };
    }

    // Проверяем есть ли ключ доступа в Redis
    const r = await fetch(`${url}/get/access:${name}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();

    if (!data.result) {
        return { statusCode: 200, body: JSON.stringify({ hasAccess: false }) };
    }

    return { statusCode: 200, body: JSON.stringify({ hasAccess: true, name }) };
};
