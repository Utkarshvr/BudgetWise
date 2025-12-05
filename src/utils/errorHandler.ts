/**
 * Extracts a user-friendly error message from various error types
 * Handles HTML error responses, network errors, and Supabase errors
 */
export function getErrorMessage(error: any, defaultMessage: string = "An error occurred"): string {
  if (!error) return defaultMessage;

  // Check if error message contains HTML (like Cloudflare error pages)
  const errorMessage = error.message || error.toString() || "";
  
  if (errorMessage.includes("<html>") || 
      errorMessage.includes("<!DOCTYPE") || 
      errorMessage.includes("<head>") ||
      errorMessage.includes("cloudflare")) {
    return "Server error. The service may be temporarily unavailable. Please try again later.";
  }

  // Check for HTTP error codes in the message
  if (errorMessage.includes("500") || errorMessage.includes("Internal Server Error")) {
    return "Server error. Please try again later or check your connection.";
  }

  if (errorMessage.includes("502") || errorMessage.includes("Bad Gateway")) {
    return "Service temporarily unavailable. Please try again in a moment.";
  }

  if (errorMessage.includes("503") || errorMessage.includes("Service Unavailable")) {
    return "Service is temporarily unavailable. Please try again later.";
  }

  if (errorMessage.includes("504") || errorMessage.includes("Gateway Timeout")) {
    return "Request timed out. Please check your connection and try again.";
  }

  // Check for network-related errors
  if (
    errorMessage.toLowerCase().includes("network") ||
    errorMessage.toLowerCase().includes("fetch") ||
    errorMessage.toLowerCase().includes("connection") ||
    errorMessage.toLowerCase().includes("timeout") ||
    errorMessage.toLowerCase().includes("failed to fetch")
  ) {
    return "Network error. Please check your internet connection and try again.";
  }

  // Handle Supabase-specific error codes
  if (error.code) {
    switch (error.code) {
      case "PGRST116":
        return "No data found.";
      case "42501":
        return "Permission denied. Please check your account access.";
      case "23505":
        return "This record already exists.";
      case "23503":
        return "Cannot delete this record as it's being used elsewhere.";
      default:
        return errorMessage || `Error: ${error.code}`;
    }
  }

  // If we have a meaningful error message, use it
  if (errorMessage && errorMessage.length > 0 && errorMessage.length < 200) {
    return errorMessage;
  }

  return defaultMessage;
}

