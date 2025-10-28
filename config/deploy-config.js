// kkam.shop 프로덕션 배포 설정
const https = require('https');
const fs = require('fs');
const path = require('path');

const productionConfig = {
    // SSL 인증서 경로 (실제 배포 시 수정 필요)
    ssl: {
        key: process.env.SSL_KEY_PATH || '/etc/ssl/private/kkam.shop.key',
        cert: process.env.SSL_CERT_PATH || '/etc/ssl/certs/kkam.shop.crt'
    },
    
    // 서버 설정
    server: {
        port: process.env.PORT || 443,
        host: '0.0.0.0'
    },
    
    // 도메인 설정
    domain: {
        primary: 'kkam.shop',
        www: 'www.kkam.shop',
        redirect: true // www를 메인 도메인으로 리다이렉트
    },
    
    // 보안 설정
    security: {
        helmet: true,
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15분
            max: 100 // 최대 100 요청
        }
    }
};

// HTTPS 서버 생성 함수
function createHttpsServer(app) {
    try {
        const options = {
            key: fs.readFileSync(productionConfig.ssl.key),
            cert: fs.readFileSync(productionConfig.ssl.cert)
        };
        
        return https.createServer(options, app);
    } catch (error) {
        console.error('SSL 인증서를 찾을 수 없습니다:', error.message);
        console.log('HTTP 서버로 실행합니다.');
        return null;
    }
}

module.exports = {
    productionConfig,
    createHttpsServer
};
