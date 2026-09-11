// ==========================================
// Azure APIM & Entra ID Configuration
// ==========================================
const CONFIG = {
    APIM_BASE_URL: "https://apim-fee-mgmt-1235.azure-api.net/api",
    APIM_KEY: "e2aef2284d084f419cc665847620c47a",
    TENANT_ID: "e6227d08-d0a7-4bef-8c44-b1bbeb6aa0e6",
    CLIENT_ID: "286be363-b0b1-4b50-9460-a4504760be43"
};

// DOM Elements
const searchForm = document.getElementById("search-form");
const studentIdInput = document.getElementById("student-id-input");
const searchBtn = document.getElementById("search-btn");
const studentResult = document.getElementById("student-result");

const resName = document.getElementById("res-name");
const resId = document.getElementById("res-id");
const resBadge = document.getElementById("res-badge");
const resTotal = document.getElementById("res-total");
const resPaid = document.getElementById("res-paid");
const resBalance = document.getElementById("res-balance");
const resDueDate = document.getElementById("res-duedate");

const updateForm = document.getElementById("update-form");
const updateStudentId = document.getElementById("update-student-id");
const updateAmount = document.getElementById("update-amount");
const updateBtn = document.getElementById("update-btn");
const updateMessage = document.getElementById("update-message");

const apiLog = document.getElementById("api-log");
const clearLogsBtn = document.getElementById("clear-logs");

// Logging Helper
function logMessage(title, data) {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${title}\n` + (typeof data === "string" ? data : JSON.stringify(data, null, 2)) + "\n\n";
    apiLog.textContent = formatted + apiLog.textContent;
}

if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", () => {
        apiLog.textContent = "// Logs cleared.\n";
    });
}

// Helper: Format Currency (INR)
function formatINR(val) {
    return "₹" + Number(val).toLocaleString("en-IN");
}

// 1. GET Payment Status Handler
searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentId = studentIdInput.value.trim();
    if (!studentId) return;

    searchBtn.disabled = true;
    searchBtn.querySelector(".btn-text").textContent = "Checking...";

    try {
        const url = `${CONFIG.APIM_BASE_URL}/paymentstatus/${studentId}`;
        logMessage(`GET Request to: ${url}`, { "Ocp-Apim-Subscription-Key": CONFIG.APIM_KEY });

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Ocp-Apim-Subscription-Key": CONFIG.APIM_KEY
            }
        });

        const data = await response.json();
        logMessage(`GET Response (${response.status})`, data);

        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }

        // Render Student Data
        resName.textContent = data.Name || `Student #${data.StudentID}`;
        resId.textContent = `Student ID: #${data.StudentID}`;
        resTotal.textContent = formatINR(data.TotalFee);
        resPaid.textContent = formatINR(data.PaidAmount);
        resBalance.textContent = formatINR(data.OutstandingAmount);
        resDueDate.textContent = data.DueDate ? data.DueDate.split("T")[0] : "N/A";

        // Status badge
        resBadge.className = "badge";
        const status = (data.PaymentStatus || "").toLowerCase();
        if (status === "paid") {
            resBadge.classList.add("badge-paid");
            resBadge.textContent = "PAID";
        } else if (status === "overdue") {
            resBadge.classList.add("badge-overdue");
            resBadge.textContent = "OVERDUE";
        } else {
            resBadge.classList.add("badge-partial");
            resBadge.textContent = "PARTIAL";
        }

        studentResult.classList.remove("hidden");
        updateStudentId.value = data.StudentID;

    } catch (err) {
        logMessage("Error fetching payment status", err.message);
        alert(`Failed to fetch payment status: ${err.message}`);
    } finally {
        searchBtn.disabled = false;
        searchBtn.querySelector(".btn-text").textContent = "Check Status";
    }
});

// 2. PUT Update Fee Handler
updateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentId = updateStudentId.value.trim();
    const amount = Number(updateAmount.value);
    const tokenInput = document.getElementById("bearer-token-input");
    const jwtToken = tokenInput ? tokenInput.value.trim() : "";

    if (!studentId || isNaN(amount) || amount < 0) {
        alert("Please enter a valid student ID and paid amount.");
        return;
    }

    if (!jwtToken) {
        updateMessage.className = "toast-box toast-error";
        updateMessage.textContent = "⚠️ Please paste your Entra ID Bearer Token from PowerShell into the token box above.";
        updateMessage.classList.remove("hidden");
        return;
    }

    updateBtn.disabled = true;
    updateBtn.querySelector(".btn-text").textContent = "Updating Fee...";
    updateMessage.className = "toast-box hidden";

    try {
        const url = `${CONFIG.APIM_BASE_URL}/updatefee/${studentId}`;
        const payload = { PaidAmount: amount };

        logMessage(`PUT Request to: ${url}`, {
            "Authorization": "Bearer " + jwtToken.substring(0, 15) + "...",
            "Ocp-Apim-Subscription-Key": CONFIG.APIM_KEY,
            "Payload": payload
        });

        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${jwtToken}`,
                "Ocp-Apim-Subscription-Key": CONFIG.APIM_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        logMessage(`PUT Response (${response.status})`, data);

        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }

        updateMessage.className = "toast-box toast-success";
        updateMessage.textContent = `✅ Success: Fee updated to ₹${amount.toLocaleString("en-IN")}`;
        updateMessage.classList.remove("hidden");

        // Automatically refresh student status card
        studentIdInput.value = studentId;
        searchForm.dispatchEvent(new Event("submit"));

    } catch (err) {
        logMessage("Error updating fee", err.message);
        updateMessage.className = "toast-box toast-error";
        updateMessage.textContent = `❌ Update failed: ${err.message}`;
        updateMessage.classList.remove("hidden");
    } finally {
        updateBtn.disabled = false;
        updateBtn.querySelector(".btn-text").textContent = "Record Payment";
    }
});

// Auto-run initial status check on load
document.addEventListener("DOMContentLoaded", () => {
    searchForm.dispatchEvent(new Event("submit"));
});
