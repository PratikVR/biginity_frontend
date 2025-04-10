import { io } from "https://cdn.socket.io/4.8.0/socket.io.esm.min.js";

// Define the base URL for the backend API
export const hostSocket = "https://beginity.ddns.net";

// Function to make general (non-secure) requests
export async function makeRequest(url, method, data = {}) {
    const reqObj = {
        method,
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(data),
    };

    if (method.toLowerCase() === "get") delete reqObj.body;

    const response = await fetch(hostSocket + url, reqObj);
    let obj = await response.json();

    if (!response.ok) throw new Error(obj.message || "some unknown error");
    return obj;
}

// Function to make secure requests with token-based authentication
export async function makeSecureRequest(url, method, data = {}) {
    const token = getItemWithExpiry("token");
    if (!token) throw new Error("Authentication required");

    const reqObj = {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    };

    if (method.toLowerCase() === "get") delete reqObj.body;

    const response = await fetch(hostSocket + url, reqObj);
    let obj = await response.json();

    if (!response.ok) throw new Error(obj.message || "some unknown error");
    return obj;
}

// Fetch classrooms
export const fetchClassrooms = async () => await makeSecureRequest("/api/classrooms", "GET");

// Fetch events
export const fetchEvents = async () => await makeSecureRequest("/api/events", "GET");

// Function to create an event
export async function createEvent(e) {
    e.preventDefault();
    const formData = new FormData(e.target, e.submitter);

    const eventJson = {
        mandatory: formData.get("mandatory") === "on",
        title: formData.get("title"),
        description: {
            objectives: formData.get("objectives").split("\n"),
            learning_outcomes: formData.get("learning_outcomes").split("\n"),
        },
        start_time: new Date(formData.get("start_time")).toISOString(),
        end_time: new Date(formData.get("end_time")).toISOString(),
        location: {
            address: formData.get("address"),
            lat: parseFloat(formData.get("lat")) || null,
            long: parseFloat(formData.get("long")) || null,
        },
        speaker_ids: formData?.get("speaker_ids")?.split(",").map(id => id.trim()),
    };

    try {
        const data = await makeSecureRequest("/api/events", "POST", eventJson);
        console.log("Event created:", data);
    } catch (error) {
        console.log(error.message);
    }
}

// Local storage helpers
export function setItemWithExpiry(key, value, ttl) {
    const now = new Date();
    const item = {
        value,
        expiry: now.getTime() + ttl,
    };
    localStorage.setItem(key, JSON.stringify(item));
}

export function getItemWithExpiry(key) {
    try {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;

        const item = JSON.parse(itemStr);
        if (new Date().getTime() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    } catch (error) {
        console.warn("error", error);
        return null;
    }
}

// Initialize socket connection
export function initSocket({
    newMessageCallback,
    connectionCallback,
    successCallback,
    errorCallback,
    attendanceStartedCallback,
    punchInCallback,
    punchOutCallback,
}) {
    const socket = io(hostSocket, { auth: { token: getItemWithExpiry("token") } });

    socket.on("punch_in", punchInCallback);
    socket.on("punch_out", punchOutCallback);
    socket.on("new_message", newMessageCallback);
    socket.on("connection", connectionCallback);
    socket.on("success", successCallback);
    socket.on("error", errorCallback);
    socket.on("AttendanceStarted", attendanceStartedCallback);

    return {
        socket,
        sendMessage: (classroom_id, message) => socket.emit("new_message", { classroom_id, message }),
        startAttendance: (classroom_id, timeout = 2) => socket.emit("start_attendance", { classroom_id, timeout }),
        joinClassRoom: classroom_ids => socket.emit("join_classroom", { classroom_ids }),
        punchIn: ({ event_id, location, classroom_id }) => socket.emit("punch_in", { event_id, location, classroom_id }),
        punchOut: ({ event_id, location, classroom_id }) => socket.emit("punch_out", { event_id, location, classroom_id }),
    };
}

// Handle event enrollment
export async function handleEnroll(id) {
    try {
        const response = await makeSecureRequest(`/api/attendances/?event_id=${id}`, "POST", {});
        console.log(response.message);
    } catch (error) {
        console.log(error.message);
    }
}

// Fetch user details
export const fetchUserDetail = async () => {
    try {
        const resSaved = getItemWithExpiry("user-details");
        if (resSaved?.role) return resSaved;

        const res = await makeSecureRequest("/api/auth/wmi", "GET", {});
        setItemWithExpiry("user-details", res, 60 * 60 * 60 * 12);
        return res;
    } catch (error) {
        console.error(error.message);
        return false;
    }
};

// File upload function
export async function uploadFile(event, successCallback = console.log, errorCallback = console.error) {
    event.preventDefault();
    const formData = new FormData(event.target, event.submitter);

    try {
        const token = getItemWithExpiry("token");
        if (!token) throw new Error("Log in/Register to perform this action");

        const response = await fetch(`${hostSocket}/file/upload/`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) throw new Error((await response.json())?.message);

        const data = await response.json();
        successCallback(data);
        return data;
    } catch (error) {
        errorCallback(error);
        return null;
    }
}

// Fetch event by ID
export const fetchEventById = async id => {
    const response = await fetch(`${hostSocket}/api/events?event_id=${id}`);
    if (!response.ok) throw new Error("Failed to fetch event data");
    return await response.json();
};
