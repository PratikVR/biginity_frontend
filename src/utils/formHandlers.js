import { makeRequest, setItemWithExpiry } from "../services/api";

export const registerUser = async (event, navigate) => {
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());
  
  console.log("Form Data Submitted:", data);

  if (data.role === "Student") {
    if (!data.branch || !data.year || !data.enrollment_id) {
      console.error("Missing student-specific fields:", { branch: data.branch, year: data.year, enrollment_id: data.enrollment_id });
      return;
    }
  }

  try {
    const response = await makeRequest("/api/auth/register", "POST", data);
    console.log("Registration successful:", response.token);

    setItemWithExpiry("token", response.token, 15 * 86400000);
    localStorage.setItem("role", data.role);
    navigate(data.role === "Teacher" ? "/TeacherDashboard" : "/StudentDashboard");
  } catch (error) {
    console.error("Registration failed:", error.message, error.response || error);
  }
};

export const logInUser = async (event, navigate) => {
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await makeRequest("/api/auth/login", "POST", data);
    setItemWithExpiry("token", response.token, 15 * 86400000);
    localStorage.setItem("role", data.role);
    navigate(data.role === "Teacher" ? "/TeacherDashboard" : "/StudentDashboard");
  } catch (error) {
    console.error("Login failed:", error.message, error.response || error);
  }
};

export const verifyEmail = async (email) => {
  try {
    const response = await makeRequest("/api/auth/otp", "POST", { email, purpose: "verification" });
    return response;
  } catch (error) {
    console.error("Verification failed:", error.message, error.response || error);
    return null;
  }
};
