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

// Business Logic: determine payment status
// Returns "Paid", "Overdue", or "Partially Paid" - matches assignment requirement
function determinePaymentStatus(totalFee, paidAmount, dueDate) {
    if (paidAmount >= totalFee) {
        return "Paid";
    } else if (new Date(dueDate) < new Date()) {
        return "Overdue";
    }
    return "Partially Paid";
}

// Azure Function: GET /api/paymentstatus/{studentid}
app.http("paymentStatus", {
    methods: ["GET"],
    authLevel: "function",
    route: "paymentstatus/{studentid}",
    handler: async (request, context) => {
        context.log("Payment Status function triggered.");

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

        let pool;
        try {
            pool = await sql.connect(dbConfig);

            // Parameterized query - prevents SQL injection
            const result = await pool.request()
                .input("studentId", sql.Int, studentId)
                .query(`
                    SELECT StudentID, Name, TotalFee, PaidAmount, DueDate
                    FROM dbo.Students
                    WHERE StudentID = @studentId;
                `);

            if (result.recordset.length === 0) {
                return {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ error: "Student not found" })
                };
            }

            const student = result.recordset[0];
            const totalFee = parseFloat(student.TotalFee);
            const paidAmount = parseFloat(student.PaidAmount);
            const outstandingAmount = parseFloat((totalFee - paidAmount).toFixed(2));
            const paymentStatus = determinePaymentStatus(totalFee, paidAmount, student.DueDate);

            return {
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    StudentID: student.StudentID,
                    Name: student.Name,
                    TotalFee: totalFee,
                    PaidAmount: paidAmount,
                    DueDate: new Date(student.DueDate).toISOString().split("T")[0],
                    OutstandingAmount: outstandingAmount,
                    PaymentStatus: paymentStatus
                })
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
