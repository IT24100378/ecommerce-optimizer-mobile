// AI service client: forwards feature payloads to the prediction API.
const axios = require('axios');

const AI_SERVICE_HOST = process.env.AI_SERVICE_HOST || '';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL
    || (AI_SERVICE_HOST ? `http://${AI_SERVICE_HOST}/predict` : 'http://127.0.0.1:8000/predict');
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';
const REQUEST_TIMEOUT_MS = 3000;

/**
 * Calls the Python AI microservice to get a predicted daily sales quantity.
 *
 * @param {object} productData - Feature object with the exact keys the model expects.
 * @param {number} productData["Price Each"]       - Unit price of the product.
 * @param {number} productData["Sales_Lag_1Day"]   - Quantity sold the previous day.
 * @param {number} productData["Sales_Lag_7Days"]  - Quantity sold 7 days ago.
 * @param {number} productData["Month"]            - Calendar month (1–12).
 * @param {number} productData["DayOfWeek"]        - Day of the week (0=Monday … 6=Sunday).
 * @param {number} productData["Rolling_Mean_7D"]  - 7-day rolling mean of daily quantity.
 * @returns {Promise<{predicted_quantity: number}|null>} Prediction result, or null on failure.
 */
// Requests a sales prediction from the configured AI service endpoint.
async function getSalesPrediction(productData) {
    try {
        const response = await axios.post(AI_SERVICE_URL, productData, {
            timeout: REQUEST_TIMEOUT_MS,
            headers: AI_SERVICE_API_KEY ? { 'X-API-Key': AI_SERVICE_API_KEY } : undefined,
        });
        return response.data;
    } catch (err) {
        console.warn('[aiService] Could not reach the AI prediction service:', err.message);
        return null;
    }
}

module.exports = { getSalesPrediction };
