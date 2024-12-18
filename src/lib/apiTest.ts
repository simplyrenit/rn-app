import { fetchWithRetry, checkServerConnection } from "./networkUtils";
import { GET_CATEGORIES } from "./config";

export const testApiConnection = async () => {
  console.log("Starting API connection test...");

  try {
    // Check server connectivity using categories endpoint
    console.log("Checking server availability...");
    const isServerAvailable = await checkServerConnection();
    if (!isServerAvailable) {
      console.error("❌ Server is not responding");
      return false;
    }
    console.log("✅ Server is responding");

    // Test categories endpoint with retry logic
    console.log("Testing categories endpoint with retry...");
    try {
      const categories = await fetchWithRetry(GET_CATEGORIES);
      console.log("✅ Categories endpoint working, received:", categories);
    } catch (error) {
      console.error("❌ Categories endpoint failed:", error);
      return false;
    }

    console.log("✅ API test passed successfully");
    return true;
  } catch (error) {
    console.error("❌ API test failed:", error);
    return false;
  }
};
