
// Mock environment variables before importing the module
process.env.MANUAL_UPSTASH_URL = 'https://mock-redis.upstash.io';
process.env.MANUAL_UPSTASH_TOKEN = 'mock-token';
process.env.GEMINI_API_KEY = 'mock-api-key';

// Mock fetch
global.fetch = async (url, options) => {
    // Redis Mock
    if (url.includes('mock-redis.upstash.io') || url.includes('/pipeline')) {
         const responseBody = [ { result: null } ];
         if (options && options.body && options.body.includes("set")) {
             responseBody[0].result = "OK";
         }
         return {
            ok: true,
            status: 200,
            headers: { get: () => null },
            json: async () => responseBody,
            text: async () => JSON.stringify(responseBody)
        };
    }

    // Gemini API Mock
    if (url.includes('generativelanguage.googleapis.com')) {

         if (url.includes('gemini-1.5-flash')) {
             return {
                ok: false,
                status: 404,
                json: async () => ({
                    error: { message: 'models/gemini-1.5-flash is not found for API version v1beta' }
                }),
                text: async () => JSON.stringify({ error: { message: 'models/gemini-1.5-flash is not found for API version v1beta' } })
            };
         }

         if (url.includes('gemini-2.5-flash-preview-05-20')) {
             return {
                ok: false,
                status: 404,
                json: async () => ({
                    error: { message: 'models/gemini-2.5-flash-preview-05-20 is not found' }
                }),
                text: async () => JSON.stringify({ error: { message: 'models/gemini-2.5-flash-preview-05-20 is not found' } })
            };
        }

        if (url.includes('gemini-2.0-flash')) {
             return {
                ok: true,
                status: 200,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: "This is a generated prompt from gemini-2.0-flash." }] } }]
                }),
                text: async () => JSON.stringify({
                    candidates: [{ content: { parts: [{ text: "This is a generated prompt from gemini-2.0-flash." }] } }]
                })
            };
        }
    }

    return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not Found' }),
        text: async () => JSON.stringify({ error: 'Not Found' })
    };
};

async function runTest() {
    console.log('Running verification test...');

    const module = await import('../api/get-prompt.js');
    const handler = module.default;

    const req = {
        method: 'POST',
        body: {
            action: 'get_today',
            prompt: 'Generate something'
        }
    };

    let responseData = null;
    let responseStatus = 0;

    const res = {
        status: (code) => {
            responseStatus = code;
            return res;
        },
        json: (data) => {
            responseData = data;
            return res;
        }
    };

    try {
        await handler(req, res);
        if (responseStatus === 200 && responseData?.text?.includes('gemini-2.0-flash')) {
            console.log('Test Passed: Successfully called gemini-2.0-flash');
        } else {
            console.error('Test Failed:', responseStatus, responseData);
            process.exit(1);
        }
    } catch (e) {
        console.error('Handler threw error:', e);
        process.exit(1);
    }
}

runTest();
