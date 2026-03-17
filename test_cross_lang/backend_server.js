// Express JS acting as the Backend Endpoint
function setupRoutes(app) {
    console.log("Initializing routes...");

    app.get('/api/cross-language-test/${user_id}', (req, res) => {
        res.send("Hello from Node.js Express!");
    });
}