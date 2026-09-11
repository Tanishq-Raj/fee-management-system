# Azure API Management Configuration

## Payment Status API

- GET /paymentstatus/{studentid}
- Authentication:
  - Subscription Key
- Rate Limiting:
  - 10 requests per minute

---

## Update Fee API

- PUT /updatefee/{studentid}

Security:

- Microsoft Entra ID (Azure AD)
- JWT Validation
- RBAC (Admin Role)
- OAuth2 Client Credentials Flow

Required Claims:

- roles = Admin

Audience:

- 16f8bc2b-59e1-4cd4-87f2-da37f6b21210