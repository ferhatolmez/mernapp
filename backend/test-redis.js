const Redis = require('ioredis');

async function testConnection(url) {
    console.log(`Testing ${url}...`);
    const redis = new Redis(url, {
        maxRetriesPerRequest: 0,
        connectTimeout: 2000
    });

    try {
        await redis.connect();
        console.log(`✅ Success: ${url}`);
        await redis.quit();
    } catch (err) {
        console.error(`❌ Failed: ${url} - ${err.message}`);
    }
}

async function run() {
    await testConnection('redis://localhost:6379');
    await testConnection('redis://127.0.0.1:6379');
}

run();
