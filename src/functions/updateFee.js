const { app } = require("@azure/functions");
const sql = require("mssql");

// DB Config reads from environment variables / Azure App Settings
const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        enableArithAbort: true,
        trustServerCertificate: false
    },
    connectionTimeout: 30000
};

// Azure Function: PUT /api/updatefee/{studentid}
// Secured at gateway level by APIM JWT validation (Admin role claim)
app.http("updateFee", {
    methods: ["PUT"],
    authLevel: "anonymous",
    route: "updatefee/{studentid}",
    handler: async (request, context) => {
        context.log("Update Fee function triggered.");

        // Validate studentid route parameter
        const studentIdRaw = request.params.studentid;
        const studentId = parseInt(studentIdRaw, 10);

        if (isNaN(studentId)) {
            return {
                status: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "Invalid Student ID" })
            };
        }

        // Parse and validate JSON body
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return {
                status: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "Invalid JSON Body" })
            };
        }

        const paidAmount = body.PaidAmount;

        // Validate PaidAmount field exists
        if (paidAmount === undefined || paidAmount === null) {
            return {
                status: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "Paid Amount is required" })
            };
        }

        // Validate PaidAmount is a number
        if (typeof paidAmount !== "number") {
            return {
                status: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "PaidAmount must be a number" })
            };
        }

        // Validate PaidAmount is not negative
        if (paidAmount < 0) {
            return {
                status: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "PaidAmount cannot be negative" })
            };
        }

        let pool;
        try {
            pool = await sql.connect(dbConfig);

            // Parameterized UPDATE query - prevents SQL injection
            const result = await pool.request()
                .input("paidAmount", sql.Decimal(10, 2), paidAmount)
                .input("studentId", sql.Int, studentId)
                .query(`
                    UPDATE dbo.Students
                    SET PaidAmount = @paidAmount
                    WHERE StudentID = @studentId;
                `);

            if (result.rowsAffected[0] === 0) {
                return {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ error: "Student Not Found" })
                };
            }

            return {
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "Fee Status Updated Successfully" })
            };

        } catch (err) {
            context.log.error("Database error:", err.message);
            return {
                status: 500,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "Internal Server Error", details: err.message })
            };
        } finally {
            if (pool) await pool.close();
        }
    }
});
