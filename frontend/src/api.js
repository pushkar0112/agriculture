const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

export const apiUrl = (path = "") =>
  `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export async function apiFetch(path, options = {}) {
  let response;

  try {
    response = await fetch(
      apiUrl(path),
      options
    );
  } catch (err) {
    if (err?.name === "AbortError") {
      throw err;
    }
    const netErr = new Error(
      "Unable to connect to AgroVision AI backend."
    );
    netErr.isNetworkError = true;
    netErr.originalError = err;
    throw netErr;
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    // Response may not contain JSON.
  }

  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail
              .map((item) => item.msg)
              .join(", ")
          : `Request failed with status ${response.status}.`;

    const error = new Error(detail);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export { API_BASE_URL };