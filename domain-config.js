// kkam.shop 도메인 설정
const domainConfig = {
    // 프로덕션 도메인
    production: {
        domain: 'kkam.shop',
        protocol: 'https',
        port: 443
    },
    
    // 개발 도메인
    development: {
        domain: 'localhost',
        protocol: 'http',
        port: 3000
    },
    
    // 현재 환경 감지
    getCurrentConfig: function() {
        const isProduction = process.env.NODE_ENV === 'production';
        return isProduction ? this.production : this.development;
    },
    
    // CORS 설정
    corsOptions: {
        origin: true, // 개발 환경에서는 모든 origin 허용
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
    },
    
    // 세션 설정
    sessionConfig: {
        secret: 'kkam-shop-secret-key-2025',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // 개발 환경에서는 false
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24시간
            sameSite: 'lax' // CSRF 보호
        }
    }
};

module.exports = domainConfig;
