# Deployment Guide for Fee Management System on Microsoft Azure

---

## 1. Project Overview

The **Fee Management System** is a cloud-native, enterprise application developed using **Microsoft Azure** services and **Node.js (Azure Functions v4 Programming Model)**. The solution enables:
- **Students / Users**: To check real-time fee payment status, paid amount, due date, and remaining balance.
- **Administrators**: To securely update student fee records through an OAuth 2.0 authenticated endpoint.
- **Automated Workflows**: To query overdue balances and automatically send personalized reminder emails to students.
- **Enterprise Security & Observability**: Incorporates API rate limiting, JWT token validation with Role-Based Access Control (RBAC), and centralized telemetry monitoring.

---

## 2. Technologies Used

### Programming Languages & Runtimes
- **Node.js** (v18.x / v20.x LTS)
- **JavaScript (ES6+)**
- **T-SQL** (Transact-SQL)
- **HTML5 / CSS3 / Vanilla JavaScript** (Frontend Dashboard)

### Microsoft Azure Cloud Services
- **Azure SQL Server & Database** (Relational data tier)
- **Azure Functions** (Serverless backend compute — Node.js v4 programming model)
- **Azure API Management (APIM)** (API Gateway, Rate Limiting & JWT verification)
- **Microsoft Entra ID (Azure AD)** (Identity, OAuth 2.0 & Role-Based Access Control)
- **Azure Logic Apps** (Automated scheduled workflow & email notifications)
- **Azure Application Insights** (Live metrics, distributed tracing & logging)
- **Azure Storage Account** (WebJobs & Function runtime state)

---

## 3. Project Architecture Diagram

> ### 📷 [INSERT IMAGE: Project Architecture Diagram]
> *(Insert your Project Architecture Diagram image here)*

### High-Level Architecture Flow:
1. **Client Tier**: Web Browser (Dashboard) and Admin CLI / PowerShell tools send HTTPS requests.
2. **API Gateway (Azure APIM)**:
   - Validates APIM Subscription Key.
   - Enforces **Rate Limiting** (10 calls / min).
   - Validates **Microsoft Entra ID JWT Bearer Tokens** and checks for the `Admin` role claim on protected endpoints.
3. **Compute Tier (Azure Functions)**: Executes Node.js serverless functions (`paymentStatus.js` and `updateFee.js`).
4. **Data Tier (Azure SQL)**: Stores `Students` and `Administrators` records accessed via parameterized queries.
5. **Scheduled Automation (Azure Logic Apps)**: Daily scheduled workflow querying overdue payments and dispatching emails via Office 365 Outlook.
6. **Observability (Application Insights)**: Real-time telemetry, exception tracking, and latency analytics.

---

## 4. Required Software Installation

| Software | Purpose | Download / Command |
| :--- | :--- | :--- |
| **Node.js (v18 or v20 LTS)** | JavaScript runtime for Azure Functions | [nodejs.org](https://nodejs.org/) |
| **Visual Studio Code** | Integrated Development Environment (IDE) | [code.visualstudio.com](https://code.visualstudio.com/) |
| **Git** | Version Control | [git-scm.com](https://git-scm.com/) |
| **Azure CLI** | Azure Cloud resource management | `winget install Microsoft.AzureCLI` |
| **Azure Functions Core Tools (v4)** | Local execution & deployment | `npm install -g azure-functions-core-tools@4` |
| **VS Code Extensions** | Development tools | Azure Tools, Azure Functions, mssql |

---

## 5. Installation and Environment Setup

### Step 1: Verify Node.js & Core Tools
```bash
node --version
npm --version
func --version
az version
```

### Step 2: Clone & Install Dependencies
```bash
git clone <REPOSITORY_URL>
cd fee-management-system

# Install Node.js packages (@azure/functions, mssql)
npm install
```

### Step 3: Configure `local.settings.json`
Create a file named `local.settings.json` in the root folder:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "DB_SERVER": "sqlserver-fee-mgmt.database.windows.net",
    "DB_NAME": "fee-management-db",
    "DB_USER": "sqladmin",
    "DB_PASSWORD": "<YOUR_STRONG_SQL_PASSWORD>",
    "APPLICATIONINSIGHTS_CONNECTION_STRING": "<YOUR_APP_INSIGHTS_CONNECTION_STRING>"
  }
}
```

### Step 4: Run Azure Functions Locally
```bash
func start
```
Functions will be available locally at:
- `http://localhost:7071/api/paymentstatus/{studentid}`
- `http://localhost:7071/api/updatefee/{studentid}`

---

## 6. Azure Resources Provisioning Order

Create the cloud resources in the following sequence:

1. **Resource Group** (e.g., `fee-management`)
2. **Azure SQL Server** (e.g., `sqlserver-fee-mgmt`)
3. **Azure SQL Database** (e.g., `fee-management-db`)
4. **Azure Storage Account** (e.g., `stfeemgmt`)
5. **Azure Application Insights** (e.g., `appi-fee-mgmt`)
6. **Azure Function App** (Node.js 18/20 LTS Consumption Plan)
7. **Azure API Management** (Consumption or Developer Tier)
8. **Microsoft Entra ID** (App Registration & Admin App Role)
9. **Azure Logic App** (Consumption Workflow)

---

## 7. Database Setup

### Step 1: Connect to Azure SQL Database
Connect via **Azure Portal Query Editor** or the **VS Code mssql extension**.

### Step 2: Execute Schema & Seed Script (`database/database_scripts.txt`)
```sql
-- Create Tables
CREATE TABLE Students (
    StudentID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL,
    Course NVARCHAR(100) NOT NULL,
    TotalFee DECIMAL(10,2) NOT NULL,
    PaidAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
    DueDate DATE NOT NULL
);

CREATE TABLE Administrators (
    AdminID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Role NVARCHAR(50) NOT NULL
);

-- Insert Sample Data
INSERT INTO dbo.Students (Name, Email, Course, TotalFee, PaidAmount, DueDate)
VALUES
('Vivek Sharma',      'vivek.sharma24@gmail.com',      'Electronics',             122000,  75000, '2026-09-08'),
('Riya Patel',        'riya.patel26@gmail.com',        'Civil Engineering',       128000, 126000, '2026-09-10'),
('Kabir Mehta',       'kabir.mehta25@gmail.com',       'Mechanical Engineering',  117000,  72000, '2026-09-06'),
('Simran Joshi',      'simran.joshi27@gmail.com',      'Computer Science',        112000, 109000, '2026-09-04'),
('Akshay Kulkarni',   'akshay.kulkarni23@gmail.com',   'Artificial Intelligence', 108000,  63000, '2026-09-02'),
('Nisha Singh',       'nisha.singh26@gmail.com',       'Information Technology',  102000,  42000, '2026-09-07');

INSERT INTO dbo.Administrators (Name, Role)
VALUES
('Ajay Sharma', 'Accounts Officer'),
('Priya Kumar', 'Finance Manager'),
('Sanjay Bhansali', 'System Administrator');
```

---

## 8. Azure Functions Deployment

### Step 1: Set Remote App Settings in Azure Portal
Under **Function App** → **Configuration / Environment variables**, add:
- `DB_SERVER` = `sqlserver-fee-mgmt.database.windows.net`
- `DB_NAME` = `fee-management-db`
- `DB_USER` = `sqladmin`
- `DB_PASSWORD` = `<YOUR_SQL_PASSWORD>`

### Step 2: Deploy Code via Azure Core Tools
```bash
az login
func azure functionapp publish <FUNCTION_APP_NAME>
```

---

## 9. API Management (APIM) Configuration

Import the deployed Azure Function App into APIM and configure operations:

### Operation 1: `GET /paymentstatus/{studentid}`
- **Purpose**: Retrieves student fee information and calculated balance.
- **Inbound Policy (`APIM/payment-status-api-policy.xml`)**:
```xml
<policies>
    <inbound>
        <base />
        <rate-limit calls="10" renewal-period="60" />
    </inbound>
    <backend><base /></backend>
    <outbound><base /></outbound>
    <on-error><base /></on-error>
</policies>
```

### Operation 2: `PUT /updatefee/{studentid}`
- **Purpose**: Allows authorized administrators to record new fee payments.
- **Inbound Policy (`APIM/update-fee-api-policy.xml`)**:
```xml
<policies>
    <inbound>
        <base />
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized - Valid Microsoft Entra token required" require-scheme="Bearer">
            <openid-config url="https://login.microsoftonline.com/{TENANT_ID}/v2.0/.well-known/openid-configuration" />
            <audiences>
                <audience>{CLIENT_ID}</audience>
            </audiences>
            <required-claims>
                <claim name="roles" match="any">
                    <value>Admin</value>
                </claim>
            </required-claims>
        </validate-jwt>
    </inbound>
    <backend><base /></backend>
    <outbound><base /></outbound>
    <on-error><base /></on-error>
</policies>
```

---

## 10. Microsoft Entra ID (Azure AD) Configuration

### Step 1: Register API Application
1. Go to **Microsoft Entra ID** → **App registrations** → **New registration** (`fee-management-api`).
2. Note the **Application (client) ID** and **Directory (tenant) ID**.

### Step 2: Create App Role
1. Under **App roles**, click **Create app role**:
   - **Display name**: `Admin`
   - **Allowed member types**: `Applications`
   - **Value**: `Admin`
   - **Description**: `Administrators with fee update permissions`
2. Click **Apply**.

### Step 3: Generate Client Secret & Grant Role
1. Under **Certificates & secrets**, generate a new **Client Secret** and copy the Value.
2. Under **API permissions** → **Add a permission** → **My APIs** → Select your App → Select `Admin` role → Click **Grant admin consent**.

---

## 11. Azure Logic App Configuration

> ### 📷 [INSERT IMAGE: Logic App Configuration / Workflow]
> *(Insert your `LogicApp/FeeReminderLogicAppWorkFlow.png` screenshot here)*

### Logic App Structure:
1. **Recurrence Trigger**: Daily at `09:00 AM IST`.
2. **Action 1: Execute a SQL query (V2)**:
   ```sql
   SELECT TOP 3 StudentID, Name, Email, TotalFee, PaidAmount, DueDate 
   FROM dbo.Students 
   WHERE PaidAmount < TotalFee AND DueDate < GETDATE();
   ```
3. **Action 2: For Each Loop**:
   - **Action 2.1 (Send an email V2)**: Dispatches personalized HTML reminder to `@items('For_each')?['Email']`.
   - **Action 2.2 (Delay)**: 10-second wait between successive emails to honor SMTP throttling limits.

---

## 12. Application Insights & Monitoring

Application Insights monitors all incoming traffic:
- **Live Metrics Stream**: Displays real-time request rates, latency (ms), and server performance.
- **Log Analytics (KQL Query)**:
```kql
requests
| where timestamp > ago(24h)
| project timestamp, name, success, resultCode, duration
| order by timestamp desc
```

---

## 13. Testing the Application (cURL / PowerShell)

### 1. Test GET Payment Status (Public)
```bash
curl -i -X GET "https://<APIM_NAME>.azure-api.net/api/paymentstatus/1" \
  -H "Ocp-Apim-Subscription-Key: <SUBSCRIPTION_KEY>"
```
*Expected Result: `200 OK` with Student Details, TotalFee, PaidAmount, and PaymentStatus.*

### 2. Test Rate Limiting
Run 12 rapid requests:
```bash
for i in {1..12}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Ocp-Apim-Subscription-Key: <SUBSCRIPTION_KEY>" \
    "https://<APIM_NAME>.azure-api.net/api/paymentstatus/1"
done
```
*Expected Result: First 10 return `200`, requests 11 and 12 return `429 Too Many Requests`.*

### 3. Test Unauthorized Access on Admin API
```bash
curl -i -X PUT "https://<APIM_NAME>.azure-api.net/api/updatefee/1" \
  -H "Ocp-Apim-Subscription-Key: <SUBSCRIPTION_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"PaidAmount": 122000}'
```
*Expected Result: `401 Unauthorized` (Blocked by APIM JWT Validation policy).*

### 4. Acquire Microsoft Entra ID Token & Test Authorized Update
```bash
# 1. Fetch OAuth 2.0 Bearer Token
TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=<CLIENT_ID>" \
  -d "client_secret=<CLIENT_SECRET>" \
  -d "scope=api://<CLIENT_ID>/.default" \
  -d "grant_type=client_credentials" | jq -r .access_token)

# 2. Invoke Authorized PUT Request
curl -i -X PUT "https://<APIM_NAME>.azure-api.net/api/updatefee/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: <SUBSCRIPTION_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"PaidAmount": 122000}'
```
*Expected Result: `200 OK` ("Fee Status Updated Successfully").*

---

## 14. Project Structure (Node.js Workspace)

```
fee-management-system/
│
├── APIM/
│   ├── payment-status-api-policy.xml   # APIM Inbound Rate-Limit Policy (10/min)
│   └── update-fee-api-policy.xml       # APIM Inbound JWT & Admin Role Policy
│
├── database/
│   └── database_scripts.txt            # SQL schema, tables, and seed records
│
├── Documentation/
│   ├── Architecture Diagram.pdf
│   ├── Deployment Guide for Fee Management System.pdf
│   └── Deployment_Guide.md             # This document
│
├── Frontend/
│   ├── index.html                      # Web Client Dashboard
│   ├── style.css                       # Modern dark-mode styling
│   └── script.js                       # Gateway API client & JWT handler
│
├── LogicApp/
│   ├── FeeReminderLogicAppWorkFlow.png # Workflow visual diagram
│   └── fee-reminder-logicapp.json      # Logic App JSON definition
│
├── src/
│   └── functions/
│       ├── paymentStatus.js            # GET /api/paymentstatus/{studentid}
│       └── updateFee.js                # PUT /api/updatefee/{studentid}
│
├── host.json                           # Azure Functions host runtime configuration
├── local.settings.json                 # Local settings & DB connection string
├── package.json                        # Node.js dependencies (@azure/functions, mssql)
└── README.md                           # Documentation overview
```

---

## 15. Security Considerations

- **Zero Trust Network Access**: Secrets, tokens, and database passwords are never hard-coded in source files or client scripts.
- **SQL Injection Prevention**: All SQL queries use parameterized inputs (`sql.Int`, `sql.Decimal`).
- **Cryptographic JWT Validation**: API Gateway cryptographically verifies token signature against Microsoft Entra OpenID configuration.
- **Source Control Safety**: `local.settings.json`, `.env`, and credentials are fully excluded in `.gitignore`.

---

## 16. Conclusion & Expected Outcomes

The **Fee Management System on Microsoft Azure** successfully demonstrates:
- ✔ **Student fee information retrieved successfully**
- ✔ **Fee records updated only by authenticated administrators**
- ✔ **Overdue fee reminders sent automatically**
- ✔ **Application requests monitored through Application Insights**
- ✔ **Rate limiting enforced through Azure API Management**
