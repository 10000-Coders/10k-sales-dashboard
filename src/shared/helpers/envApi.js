// API base URL is set via NEXT_PUBLIC_baseUrl (e.g. http://localhost:8000/api/sales)
const envConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_baseUrl || "/api/sales",
};

export { envConfig };
