const crypto = require('crypto');

exports.handler = async (event) => {
    // Принимаем только POST-запросы
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    const adminPass = process.env.ADMIN_PASS || "default123";

    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch(e) {}

    const action = body.action || 'create';

    // 1. Проверка пароля для любого действия
    if (String(body.pass || "") !== adminPass) {
        return { statusCode: 403, body: JSON.stringify({ error: "wrong_password" }) };
    }

    // 2. Обработчик действия "list" (получить все коды для истории)
    if (action === 'list') {
        try {
            const keysResponse = await fetch(`${url}/keys/code:*`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const keysData = await keysResponse.json();
            const keys = keysData.result || [];
            
            const codes = [];
            for (const key of keys) {
                const codeResponse = await fetch(`${url}/get/${key}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const codeData = await codeResponse.json();
                if (codeData.result) {
                    const info = JSON.parse(codeData.result);
                    codes.push({
                        name: info.name,
                        code: key.replace('code:', ''),
                        createdAt: info.createdAt,
                        expiresAt: info.expiresAt
                    });
                }
            }
            
            return {
                statusCode: 200,
                body: JSON.stringify({ codes })
            };
        } catch (e) {
            return { statusCode: 500, body: JSON.stringify({ error: "list_failed" }) };
        }
    }

    // 3. Обработчик действия "revoke" (отозвать доступ)
    if (action === 'revoke') {
        const name = String(body.name || "").trim();
        if (!name) return { statusCode: 400, body: JSON.stringify({ error: "name_required" }) };

        try {
            // Удаляем ключ доступа
            await fetch(`${url}/del/access:${name}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Находим и удаляем все коды с этим именем
            const keysResponse = await fetch(`${url}/keys/code:*`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const keysData = await keysResponse.json();
            const keys = keysData.result || [];

            for (const key of keys) {
                const codeResponse = await fetch(`${url}/get/${key}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const codeData = await codeResponse.json();
                if (codeData.result) {
                    const info = JSON.parse(codeData.result);
                    if (info.name === name) {
                        await fetch(`${url}/del/${key}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                    }
                }
            }

            return { statusCode: 200, body: JSON.stringify({ ok: true }) };
        } catch (e) {
            return { statusCode: 500, body: JSON.stringify({ error: "revoke_failed" }) };
        }
    }

    // 4. Обработчик по умолчанию: создание нового кода
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
