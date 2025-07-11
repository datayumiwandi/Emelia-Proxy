// File: api/check.js
// TIDAK ADA PERUBAHAN DARI VERSI SEBELUMNYA

import { connect as netConnect } from 'net';
import { connect as tlsConnect } from 'tls';

const IP_RESOLVER = "speed.cloudflare.com";
const PATH_RESOLVER = "/meta";
const TIMEOUT = 8000; // 8 detik

function fetchCloudflareMeta(options) {
    return new Promise((resolve, reject) => {
        const payload = `GET ${options.path} HTTP/1.1\r\nHost: ${options.host}\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n`;
        const connectOptions = {
            host: options.proxy.ip,
            port: options.proxy.port,
            timeout: TIMEOUT,
        };
        const socket = netConnect(connectOptions, () => {
            const tlsSocket = tlsConnect({ socket: socket, servername: options.host, rejectUnauthorized: false }, () => {
                tlsSocket.write(payload);
            });
            let response = '';
            tlsSocket.on('data', chunk => { response += chunk.toString(); });
            tlsSocket.on('end', () => {
                try {
                    const [, body] = response.split('\r\n\r\n', 2);
                    if (body) resolve(JSON.parse(body));
                    else reject(new Error('Empty response'));
                } catch (e) { reject(new Error('JSON Parse Error')); }
            });
            tlsSocket.on('error', err => reject(err));
        });
        socket.on('timeout', () => { socket.destroy(new Error('Timeout')); });
        socket.on('error', err => reject(err));
    });
}

export default async function handler(req, res) {
    let { proxy } = req.query;
    if (!proxy) {
        return res.status(400).json({ error: "Parameter 'proxy' harus diberikan." });
    }

    let cleanedProxy = proxy
        .replace(/^(https?:\/\/)/, '')
        .replace(/,/g, ':')
        .replace(/\//g, '')
        .trim();

    const parts = cleanedProxy.split(':');
    const ip = parts[0];
    const port = parts.length > 1 ? parseInt(parts[1], 10) : 443;

    if (!ip || isNaN(port)) {
        return res.status(400).json({ error: "Format proxy tidak valid setelah dibersihkan." });
    }

    const startTime = Date.now();
    try {
        const pxy = await fetchCloudflareMeta({ host: IP_RESOLVER, path: PATH_RESOLVER, proxy: { ip, port } });
        const delay = Date.now() - startTime;
        res.status(200).json({
            ip: ip, port: port, proxyip: true,
            asOrganization: pxy.asOrganization || 'N/A',
            countryCode: pxy.country || 'N/A',
            countryName: pxy.country || 'N/A',
            asn: pxy.asn || 'N/A',
            httpProtocol: pxy.httpProtocol || 'Unknown',
            delay: `${delay} ms`,
            latitude: pxy.latitude || 'N/A',
            longitude: pxy.longitude || 'N/A',
            message: `Proxy Alive ${ip}:${port}`
        });
    } catch (error) {
        res.status(200).json({
            ip: ip, port: port, proxyip: false,
            message: `Proxy Dead: ${error.message}`
        });
    }
}
