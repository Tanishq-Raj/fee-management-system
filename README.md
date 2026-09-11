# Fee Management System on Microsoft Azure

A cloud-native, enterprise-grade **Fee Management System** built on **Microsoft Azure** using **Node.js (Azure Functions v4 Programming Model)**, **Azure SQL Database**, **Azure API Management (APIM)**, **Microsoft Entra ID (Azure AD)**, and **Azure Logic Apps**.

---

## 🏛️ System Architecture

```
[ Web Dashboard / Client ]
            │ (HTTPS)
            ▼
[ Azure API Management (APIM) ] ── (Rate Limiting: 10 req/min & Entra ID JWT Validation)
            │
            ├──► [ GET  /api/paymentstatus/{id} ] ──► [ Azure SQL: Students Table ]
            │                                                 ▲
            └──► [ PUT  /api/updatefee/{id}     ] ────────────┤ (Parameterized UPDATE)
                                                              │
[ Azure Logic App (Daily 9:00 AM IST) ] ──────────────────────┤ (Query Overdue Fees)
            │
            ▼
[ Office 365 Outlook Connector ] ──► (Sends Personalized HTML Reminders to Students)

* Centralized Telemetry & Metrics monitored across all components by Azure Application Insights.
```

### Key Architectural Pillars:
1. **Frontend Dashboard (`Frontend/`)**: Modern dark-mode web application for student fee lookup and OAuth 2.0 authorized admin payments.
2. **API Gateway (`APIM/`)**:
   - `GET /api/paymentstatus/{studentid}`: Protected by APIM Subscription Key & Rate Limiting (10 req/min).
   - `PUT /api/updatefee/{studentid}`: Protected by Microsoft Entra ID JWT validation verifying the `Admin` application role claim.
3. **Serverless Compute (`src/functions/`)**:
   - `paymentStatus.js`: Node.js Azure Function computing total fee, paid amount, remaining balance, and status (`Paid`, `Overdue`, `Partially Paid`).
   - `updateFee.js`: Node.js Azure Function validating inputs and executing parameterized SQL updates.
4. **Data Tier (`database/`)**: Azure SQL Database storing `Students` and `Administrators` entities.
5. **Scheduled Automation (`LogicApp/`)**: Azure Logic App running daily at 9:00 AM IST to query overdue balances and send sequential reminder emails.
6. **Centralized Monitoring**: Azure Application Insights streaming live metrics, distributed traces, and audit logs.

---

## 📁 Repository Structure

```
d:/fee-management-system/
│
├── APIM/
│   ├── payment-status-api-policy.xml   # APIM Inbound Rate-Limit Policy (10 calls/min)
│   ├── update-fee-api-policy.xml       # APIM Inbound JWT Validation & Admin Role Policy
│   └── README.md                       # APIM policies documentation
│
├── database/
│   └── database_scripts.txt            # SQL DDL schemas, seed records & automated queries
│
├── Documentation/
│   ├── Architecture Diagram.pdf
│   ├── Deployment Guide for Fee Management System on Microsoft Azure.pdf
│   └── Deployment_Guide.md             # Complete step-by-step deployment documentation
│
├── Frontend/
│   ├── index.html                      # Interactive Web Dashboard UI
│   ├── style.css                       # Modern dark-mode styling
│   └── script.js                       # Gateway API client & JWT token handler
│
├── LogicApp/
│   ├── FeeReminderLogicAppWorkFlow.png # Workflow designer visual flow
│   └── fee-reminder-logicapp.json      # Logic App JSON workflow definition
│
├── src/
│   └── functions/
│       ├── paymentStatus.js            # GET /api/paymentstatus/{studentid}
│       └── updateFee.js                # PUT /api/updatefee/{studentid}
│
├── host.json                           # Azure Functions host & Application Insights config
├── local.settings.json                 # Local environment settings (Excluded from git)
├── package.json                        # Node.js dependencies (@azure/functions, mssql)
├── package-lock.json                   # Dependency lockfile
├── requirements.txt                    # Runtime & package management reference
└── README.md                           # Project documentation
```

---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) (v18.x or v20.x LTS) & npm
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- An active Microsoft Azure Subscription with permissions for SQL, Functions, APIM, Entra ID, and Logic Apps.

---

## 🚀 Local Development & Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure `local.settings.json`
Create a `local.settings.json` in the root folder:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "DB_SERVER": "sqlserver-fee-mgmt.database.windows.net",
    "DB_NAME": "fee-management-db",
    "DB_USER": "sqladmin",
    "DB_PASSWORD": "<YOUR_SQL_PASSWORD>",
    "APPLICATIONINSIGHTS_CONNECTION_STRING": "<YOUR_APP_INSIGHTS_CONNECTION_STRING>"
  }
}
```

### 3. Start Backend Functions Locally
```bash
func start
```
Endpoints will be available at:
- `http://localhost:7071/api/paymentstatus/{studentid}`
- `http://localhost:7071/api/updatefee/{studentid}`

### 4. Launch Frontend Dashboard
```bash
cd Frontend
python -m http.server 5500
# Open http://localhost:5500 in your browser
```

---

## ☁️ Cloud Deployment

### 1. Deploy Azure Functions
```bash
az login
func azure functionapp publish <FUNCTION_APP_NAME>
```

### 2. Configure Application Settings in Azure
Under Azure Function App → Configuration / Environment variables:
- `DB_SERVER`: `sqlserver-fee-mgmt.database.windows.net`
- `DB_NAME`: `fee-management-db`
- `DB_USER`: `sqladmin`
- `DB_PASSWORD`: `<YOUR_SQL_PASSWORD>`

---

## 🧪 API Verification & Testing

### 1. Test Payment Status API (GET)
```powershell
Invoke-RestMethod -Uri "https://<APIM_NAME>.azure-api.net/api/paymentstatus/1" `
  -Headers @{ "Ocp-Apim-Subscription-Key" = "<SUBSCRIPTION_KEY>" }
```

### 2. Test Rate Limiting (10 requests/minute)
```powershell
1..12 | ForEach-Object {
    Invoke-RestMethod -Uri "https://<APIM_NAME>.azure-api.net/api/paymentstatus/1" `
      -Headers @{ "Ocp-Apim-Subscription-Key" = "<SUBSCRIPTION_KEY>" }
}
# Output: Returns 200 OK for calls 1-10, then 429 Too Many Requests on calls 11-12
```

### 3. Acquire Microsoft Entra ID Bearer Token
```powershell
$tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token" `
  -Method POST -ContentType "application/x-www-form-urlencoded" `
  -Body @{
      client_id     = "<CLIENT_ID>"
      client_secret = "<CLIENT_SECRET>"
      scope         = "api://<CLIENT_ID>/.default"
      grant_type    = "client_credentials"
  }
$tokenResponse.access_token | Set-Clipboard
```

### 4. Test Authorized Admin Fee Update (PUT)
```powershell
Invoke-RestMethod -Uri "https://<APIM_NAME>.azure-api.net/api/updatefee/1" -Method Put `
  -Headers @{
      "Ocp-Apim-Subscription-Key" = "<SUBSCRIPTION_KEY>"
      "Authorization"             = "Bearer $($tokenResponse.access_token)"
  } `
  -Body '{"PaidAmount": 122000}' -ContentType "application/json"
```

---

## 🔒 Security & Best Practices

- **Zero-Trust Access**: Administrative endpoints require valid Microsoft Entra ID JWT Bearer tokens with the `Admin` role.
- **SQL Injection Defense**: Parameterized SQL queries prevent injection attacks.
- **Gateway Throttling**: APIM rate limits protect downstream functions from denial of service.
- **Credential Safety**: All secrets, passwords, and tokens are stored in environment variables and excluded from Git via `.gitignore`.