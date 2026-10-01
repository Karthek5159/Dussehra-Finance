/* =========================================================
   DUSSEHRA FINANCE — APPLICATION JAVASCRIPT
   Google Apps Script Backend
   ========================================================= */

"use strict";


/* =========================================================
   1. CONFIGURATION
   ========================================================= */

const CONFIG = {

    API_URL:
        "https://script.google.com/macros/s/AKfycbxXHyO95LALy-jEUe-hUlgV1VOOhfOHCLIwWzW2yqsZT8N_XOjFqIC0fMYi4b5tLCgh/exec",

    REFRESH_INTERVAL: 60000

};


/* =========================================================
   2. APPLICATION STATE
   ========================================================= */

const App = {

    isAdmin: false,

    currentPage: "dashboard",

    adminToken: null,

    loading: false,

    formType: null,

    data: {

        festival: {
            name: "Dussehra Finance 2026",
            year: 2026
        },

        income: [],
        expenses: [],
        rentals: [],
        transport: [],
        budget: []

    }

};


/* =========================================================
   3. DOM HELPERS
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}


function $$(selector) {
    return document.querySelectorAll(selector);
}


/* =========================================================
   4. BASIC HELPERS
   ========================================================= */

function numberValue(value) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}


function formatCurrency(value) {

    return new Intl.NumberFormat("en-IN", {

        style: "currency",

        currency: "INR",

        minimumFractionDigits: 2,

        maximumFractionDigits: 2

    }).format(numberValue(value));

}


function escapeHtml(value) {

    return String(value ?? "")

        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHtml(value);
    }

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(date);

}


function todayForInput() {

    const date = new Date();

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


/* =========================================================
   5. CONNECTION STATUS
   ========================================================= */

function setConnectionStatus(
    message,
    type = "normal"
) {

    const element =
        $("#connectionStatus");

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.classList.remove(
        "status-online",
        "status-offline",
        "status-loading"
    );

    if (type === "online") {

        element.classList.add(
            "status-online"
        );

    }

    if (type === "offline") {

        element.classList.add(
            "status-offline"
        );

    }

    if (type === "loading") {

        element.classList.add(
            "status-loading"
        );

    }

}


/* =========================================================
   6. API GET
   ========================================================= */

async function apiGet(action) {

    const url =
        CONFIG.API_URL +
        "?action=" +
        encodeURIComponent(action);

    const response =
        await fetch(
            url,
            {
                method: "GET",
                cache: "no-store"
            }
        );

    if (!response.ok) {

        throw new Error(
            `Server returned HTTP ${response.status}`
        );

    }

    const data =
        await response.json();

    if (
        !data ||
        data.success === false
    ) {

        throw new Error(
            data?.message ||
            "API request failed."
        );

    }

    return data;

}


/* =========================================================
   7. API POST
   ========================================================= */

async function apiPost(payload) {

    const response =
        await fetch(
            CONFIG.API_URL,
            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body:
                    JSON.stringify(payload)

            }
        );


    if (!response.ok) {

        throw new Error(
            `Server returned HTTP ${response.status}`
        );

    }


    const data =
        await response.json();


    if (
        !data ||
        data.success === false
    ) {

        throw new Error(
            data?.message ||
            "Server request failed."
        );

    }


    return data;

}


/* =========================================================
   8. LOAD ALL DATA
   ========================================================= */

async function loadAllData() {

    setConnectionStatus(
        "Connecting...",
        "loading"
    );

    try {

        App.loading = true;

        const result =
            await apiGet("all");


        if (result.festival) {

            App.data.festival =
                result.festival;

        }


        App.data.income =
            Array.isArray(result.income)
                ? result.income
                : [];


        App.data.expenses =
            Array.isArray(result.expenses)
                ? result.expenses
                : [];


        App.data.rentals =
            Array.isArray(result.rentals)
                ? result.rentals
                : [];


        App.data.transport =
            Array.isArray(result.transport)
                ? result.transport
                : [];


        App.data.budget =
            Array.isArray(result.budget)
                ? result.budget
                : [];


        renderApplication();


        setConnectionStatus(
            App.isAdmin
                ? "Admin Mode"
                : "Connected",
            "online"
        );


        return true;

    }
    catch (error) {

        console.error(
            "Dussehra Finance API error:",
            error
        );


        setConnectionStatus(
            "Connection Error",
            "offline"
        );


        showApplicationError(
            "Unable to load finance data. Please check your internet connection or try again."
        );


        return false;

    }
    finally {

        App.loading = false;

    }

}


/* =========================================================
   9. LOAD DASHBOARD
   ========================================================= */

async function loadDashboard() {

    try {

        const result =
            await apiGet("dashboard");


        if (result.festival) {

            App.data.festival =
                result.festival;

        }


        renderDashboardFromApi(
            result
        );


        setConnectionStatus(
            App.isAdmin
                ? "Admin Mode"
                : "Connected",
            "online"
        );


        return true;

    }
    catch (error) {

        console.error(
            "Dashboard API error:",
            error
        );


        setConnectionStatus(
            "Connection Error",
            "offline"
        );


        return false;

    }

}


/* =========================================================
   10. APPLICATION ERROR
   ========================================================= */

function showApplicationError(message) {

    const existing =
        $("#applicationError");

    if (existing) {
        existing.remove();
    }


    const errorElement =
        document.createElement("div");


    errorElement.id =
        "applicationError";


    errorElement.className =
        "alert alert-error";


    errorElement.innerHTML = `

        <strong>
            Connection Error
        </strong>

        <div>
            ${escapeHtml(message)}
        </div>

    `;


    const main =
        document.querySelector("main") ||
        document.body;


    main.prepend(
        errorElement
    );

}


/* =========================================================
   11. SUMMARY CALCULATION
   ========================================================= */

function calculateSummary() {

    const totalIncome =
        App.data.income.reduce(
            (total, item) =>
                total +
                numberValue(
                    item.Expected ??
                    item.expected ??
                    item.Amount ??
                    item.amount
                ),
            0
        );


    const receivedIncome =
        App.data.income.reduce(
            (total, item) =>
                total +
                numberValue(
                    item.Received ??
                    item.received
                ),
            0
        );


    const pendingIncome =
        Math.max(
            totalIncome -
            receivedIncome,
            0
        );


    const expenseTotal =
        App.data.expenses.reduce(
            (total, item) =>
                total +
                numberValue(
                    item.Amount ??
                    item.amount
                ),
            0
        );


    const rentalTotal =
        App.data.rentals.reduce(
            (total, item) =>
                total +
                numberValue(
                    item.Amount ??
                    item.amount
                ),
            0
        );


    const rentalPaid =
        App.data.rentals.reduce(
            (total, item) =>
                total +
                numberValue(
                    item.Paid ??
                    item.paid
                ),
            0
        );


    const transportTotal =
        App.data.transport.reduce(
            (total, item) =>
                total +
                numberValue(
                    item.Amount ??
                    item.amount
                ),
            0
        );


    const transportPaid =
        App.data.transport.reduce(
            (total, item) =>
                total +
                numberValue(
                    item.Paid ??
                    item.paid
                ),
            0
        );


    const totalOutgoing =
        expenseTotal +
        rentalPaid +
        transportPaid;


    const cashBalance =
        receivedIncome -
        totalOutgoing;


    const totalBudget =
        App.data.budget.reduce(
            (total, item) =>
                total +
                numberValue(
                    item.Amount ??
                    item.amount
                ),
            0
        );


    return {

        totalIncome,

        receivedIncome,

        pendingIncome,

        expenseTotal,

        rentalTotal,

        rentalPaid,

        transportTotal,

        transportPaid,

        totalOutgoing,

        cashBalance,

        totalBudget

    };

}


/* =========================================================
   12. DASHBOARD FROM API
   ========================================================= */

function renderDashboardFromApi(result) {

    const summary =
        result.summary || {};


    setText(
        "#festivalName",
        result.festival?.name ||
        "Dussehra Finance 2026"
    );


    setText(
        "#totalIncome",
        formatCurrency(
            summary.totalIncome || 0
        )
    );


    setText(
        "#receivedIncome",
        formatCurrency(
            summary.receivedIncome || 0
        )
    );


    setText(
        "#pendingIncome",
        formatCurrency(
            summary.pendingIncome || 0
        )
    );


    setText(
        "#totalOutgoing",
        formatCurrency(
            summary.totalOutgoing || 0
        )
    );


    setText(
        "#cashBalance",
        formatCurrency(
            summary.cashBalance || 0
        )
    );


    setText(
        "#totalBudget",
        formatCurrency(
            summary.totalBudget || 0
        )
    );


    setText(
        "#expenseTotal",
        formatCurrency(
            summary.expenseTotal || 0
        )
    );


    setText(
        "#rentalTotal",
        formatCurrency(
            summary.rentalPaid || 0
        )
    );


    setText(
        "#transportTotal",
        formatCurrency(
            summary.transportPaid || 0
        )
    );


    setText(
        "#breakdownOutgoing",
        formatCurrency(
            summary.totalOutgoing || 0
        )
    );

}


/* =========================================================
   13. TEXT HELPER
   ========================================================= */

function setText(
    selector,
    value
) {

    const element =
        $(selector);

    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   14. DASHBOARD LOCAL RENDER
   ========================================================= */

function renderDashboard() {

    const summary =
        calculateSummary();


    setText(
        "#festivalName",
        App.data.festival.name
    );


    setText(
        "#totalIncome",
        formatCurrency(
            summary.totalIncome
        )
    );


    setText(
        "#receivedIncome",
        formatCurrency(
            summary.receivedIncome
        )
    );


    setText(
        "#pendingIncome",
        formatCurrency(
            summary.pendingIncome
        )
    );


    setText(
        "#totalOutgoing",
        formatCurrency(
            summary.totalOutgoing
        )
    );


    setText(
        "#cashBalance",
        formatCurrency(
            summary.cashBalance
        )
    );


    setText(
        "#totalBudget",
        formatCurrency(
            summary.totalBudget
        )
    );


    setText(
        "#expenseTotal",
        formatCurrency(
            summary.expenseTotal
        )
    );


    setText(
        "#rentalTotal",
        formatCurrency(
            summary.rentalPaid
        )
    );


    setText(
        "#transportTotal",
        formatCurrency(
            summary.transportPaid
        )
    );


    setText(
        "#breakdownOutgoing",
        formatCurrency(
            summary.totalOutgoing
        )
    );

}


/* =========================================================
   15. INCOME TABLE
   ========================================================= */

function renderIncomeTable() {

    const table =
        $("#incomeTable");

    if (!table) {
        return;
    }


    if (
        App.data.income.length === 0
    ) {

        table.innerHTML = `

            <div class="empty-state">

                <h4>
                    No income records
                </h4>

                <p>
                    Income records will appear here.
                </p>

            </div>

        `;

        return;

    }


    table.innerHTML = `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>ID</th>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Expected</th>
                        <th>Received</th>
                        <th>Payment Mode</th>
                        <th>Notes</th>
                        ${
                            App.isAdmin
                                ? "<th>Actions</th>"
                                : ""
                        }

                    </tr>

                </thead>

                <tbody>

                    ${App.data.income.map(item => `

                        <tr>

                            <td>
                                ${escapeHtml(item.ID)}
                            </td>

                            <td>
                                ${formatDate(item.Date)}
                            </td>

                            <td>
                                ${escapeHtml(item.Name)}
                            </td>

                            <td>
                                ${escapeHtml(item.Category)}
                            </td>

                            <td>
                                ${formatCurrency(item.Expected)}
                            </td>

                            <td>
                                ${formatCurrency(item.Received)}
                            </td>

                            <td>
                                ${escapeHtml(item.PaymentMode)}
                            </td>

                            <td>
                                ${escapeHtml(item.Notes)}
                            </td>

                            ${
                                App.isAdmin
                                    ? `

                                    <td>

                                        <button
                                            type="button"
                                            class="admin-action-button edit-record-button"
                                            data-type="income"
                                            data-id="${escapeHtml(item.ID)}"
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            class="admin-action-button delete-record-button"
                                            data-type="income"
                                            data-id="${escapeHtml(item.ID)}"
                                        >
                                            Delete
                                        </button>

                                    </td>

                                    `
                                    : ""
                            }

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;


    initializeRecordActions();

}


/* =========================================================
   16. EXPENSE TABLE
   ========================================================= */

function renderExpenseTable() {

    const table =
        $("#expenseTable");

    if (!table) {
        return;
    }


    if (
        App.data.expenses.length === 0
    ) {

        table.innerHTML = `

            <div class="empty-state">

                <h4>
                    No expense records
                </h4>

                <p>
                    Expense records will appear here.
                </p>

            </div>

        `;

        return;

    }


    table.innerHTML = `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>ID</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Payment Mode</th>
                        <th>Notes</th>

                        ${
                            App.isAdmin
                                ? "<th>Actions</th>"
                                : ""
                        }

                    </tr>

                </thead>

                <tbody>

                    ${App.data.expenses.map(item => `

                        <tr>

                            <td>
                                ${escapeHtml(item.ID)}
                            </td>

                            <td>
                                ${formatDate(item.Date)}
                            </td>

                            <td>
                                ${escapeHtml(item.Description)}
                            </td>

                            <td>
                                ${escapeHtml(item.Category)}
                            </td>

                            <td>
                                ${formatCurrency(item.Amount)}
                            </td>

                            <td>
                                ${escapeHtml(item.PaymentMode)}
                            </td>

                            <td>
                                ${escapeHtml(item.Notes)}
                            </td>

                            ${
                                App.isAdmin
                                    ? `

                                    <td>

                                        <button
                                            type="button"
                                            class="admin-action-button edit-record-button"
                                            data-type="expense"
                                            data-id="${escapeHtml(item.ID)}"
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            class="admin-action-button delete-record-button"
                                            data-type="expense"
                                            data-id="${escapeHtml(item.ID)}"
                                        >
                                            Delete
                                        </button>

                                    </td>

                                    `
                                    : ""
                            }

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;


    initializeRecordActions();

}


/* =========================================================
   17. RENTAL TABLE
   ========================================================= */

function renderRentalTable() {

    const table =
        $("#rentalTable");

    if (!table) {
        return;
    }


    if (
        App.data.rentals.length === 0
    ) {

        table.innerHTML = `

            <div class="empty-state">

                <h4>
                    No rental records
                </h4>

                <p>
                    Rental records will appear here.
                </p>

            </div>

        `;

        return;

    }


    table.innerHTML = `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>ID</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Notes</th>

                        ${
                            App.isAdmin
                                ? "<th>Actions</th>"
                                : ""
                        }

                    </tr>

                </thead>

                <tbody>

                    ${App.data.rentals.map(item => `

                        <tr>

                            <td>
                                ${escapeHtml(item.ID)}
                            </td>

                            <td>
                                ${formatDate(item.Date)}
                            </td>

                            <td>
                                ${escapeHtml(item.Description)}
                            </td>

                            <td>
                                ${escapeHtml(item.Category)}
                            </td>

                            <td>
                                ${formatCurrency(item.Amount)}
                            </td>

                            <td>
                                ${formatCurrency(item.Paid)}
                            </td>

                            <td>
                                ${escapeHtml(item.Notes)}
                            </td>

                            ${
                                App.isAdmin
                                    ? `

                                    <td>

                                        <button
                                            type="button"
                                            class="admin-action-button edit-record-button"
                                            data-type="rental"
                                            data-id="${escapeHtml(item.ID)}"
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            class="admin-action-button delete-record-button"
                                            data-type="rental"
                                            data-id="${escapeHtml(item.ID)}"
                                        >
                                            Delete
                                        </button>

                                    </td>

                                    `
                                    : ""
                            }

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;


    initializeRecordActions();

}


/* =========================================================
   18. TRANSPORT TABLE
   ========================================================= */

function renderTransportTable() {

    const table =
        $("#transportTable");

    if (!table) {
        return;
    }


    if (
        App.data.transport.length === 0
    ) {

        table.innerHTML = `

            <div class="empty-state">

                <h4>
                    No transport records
                </h4>

                <p>
                    Transport records will appear here.
                </p>

            </div>

        `;

        return;

    }


    table.innerHTML = `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>ID</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Notes</th>

                        ${
                            App.isAdmin
                                ? "<th>Actions</th>"
                                : ""
                        }

                    </tr>

                </thead>

                <tbody>

                    ${App.data.transport.map(item => `

                        <tr>

                            <td>
                                ${escapeHtml(item.ID)}
                            </td>

                            <td>
                                ${formatDate(item.Date)}
                            </td>

                            <td>
                                ${escapeHtml(item.Description)}
                            </td>

                            <td>
                                ${escapeHtml(item.Category)}
                            </td>

                            <td>
                                ${formatCurrency(item.Amount)}
                            </td>

                            <td>
                                ${formatCurrency(item.Paid)}
                            </td>

                            <td>
                                ${escapeHtml(item.Notes)}
                            </td>

                            ${
                                App.isAdmin
                                    ? `

                                    <td>

                                        <button
                                            type="button"
                                            class="admin-action-button edit-record-button"
                                            data-type="transport"
                                            data-id="${escapeHtml(item.ID)}"
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            class="admin-action-button delete-record-button"
                                            data-type="transport"
                                            data-id="${escapeHtml(item.ID)}"
                                        >
                                            Delete
                                        </button>

                                    </td>

                                    `
                                    : ""
                            }

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;


    initializeRecordActions();

}


/* =========================================================
   19. INCOME SUMMARY
   ========================================================= */

function renderIncomeSummary() {

    const element =
        $("#incomeSummary");

    if (!element) {
        return;
    }


    const expected =
        App.data.income.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    item.Expected
                ),
            0
        );


    const received =
        App.data.income.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    item.Received
                ),
            0
        );


    const pending =
        Math.max(
            expected -
            received,
            0
        );


    element.innerHTML = `

        <div class="summary-card">

            <span>
                Expected
            </span>

            <strong>
                ${formatCurrency(expected)}
            </strong>

        </div>


        <div class="summary-card">

            <span>
                Received
            </span>

            <strong>
                ${formatCurrency(received)}
            </strong>

        </div>


        <div class="summary-card">

            <span>
                Pending
            </span>

            <strong>
                ${formatCurrency(pending)}
            </strong>

        </div>


        <div class="summary-card">

            <span>
                Records
            </span>

            <strong>
                ${App.data.income.length}
            </strong>

        </div>

    `;

}


/* =========================================================
   20. EXPENSE SUMMARY
   ========================================================= */

function renderExpenseSummary() {

    const element =
        $("#expenseSummary");

    if (!element) {
        return;
    }


    const total =
        App.data.expenses.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    item.Amount
                ),
            0
        );


    element.innerHTML = `

        <div class="summary-card">

            <span>
                Total Expenses
            </span>

            <strong>
                ${formatCurrency(total)}
            </strong>

        </div>


        <div class="summary-card">

            <span>
                Records
            </span>

            <strong>
                ${App.data.expenses.length}
            </strong>

        </div>

    `;

}


/* =========================================================
   21. RENTAL SUMMARY
   ========================================================= */

function renderRentalSummary() {

    const element =
        $("#rentalSummary");

    if (!element) {
        return;
    }


    const total =
        App.data.rentals.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    item.Amount
                ),
            0
        );


    const paid =
        App.data.rentals.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    item.Paid
                ),
            0
        );


    const pending =
        Math.max(
            total -
            paid,
            0
        );


    element.innerHTML = `

        <div class="summary-card">

            <span>
                Total Rental
            </span>

            <strong>
                ${formatCurrency(total)}
            </strong>

        </div>


        <div class="summary-card">

            <span>
                Paid
            </span>

            <strong>
                ${formatCurrency(paid)}
            </strong>

        </div>


        <div class="summary-card">

            <span>
                Pending
            </span>

            <strong>
                ${formatCurrency(pending)}
            </strong>

        </div>


        <div class="summary-card">

            <span>
                Records
            </span>

            <strong>
                ${App.data.rentals.length}
            </strong>

        </div>

    `;

}


/* =========================================================
   22. TRANSPORT SUMMARY
   ========================================================= */

function renderTransportSummary() {

    const element =
        $("#transportSummary");

    if (!element) {
        return;
    }


    const total =
        App.data.transport.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    item.Amount
                ),
            0
        );


    const paid =
        App.data.transport.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    item.Paid
                ),
            0
        );


    const pending =
        Math.max(
            total -
            paid,
            0
        );


    element.innerHTML = `

        <div class="summary-card">

            <span>
                Total Transport
            </span>

            <strong>
                ${formatCurrency(total)}
            </strong>

        </div>


        <div class="summary-card">

            <span>
                Paid
            </span>

            <strong>
                ${formatCurrency(paid)}
            </strong>

        </div>


        <div class="summary-card">

            <span>
                Pending
            </span>

            <strong>
                ${formatCurrency(pending)}
            </strong>

        </div>


        <div class="summary-card">

            <span>
                Records
            </span>

            <strong>
                ${App.data.transport.length}
            </strong>

        </div>

    `;

}


/* =========================================================
   23. RECENT TRANSACTIONS
   ========================================================= */

function renderRecentTransactions() {

    const container =
        $("#recentTransactions");

    const countElement =
        $("#transactionCount");


    if (!container) {
        return;
    }


    const transactions = [];


    /* ---------------- INCOME ---------------- */

    (App.data.income || [])
        .forEach(item => {

            const expected =
                numberValue(
                    item.Expected ??
                    item.expected
                );


            const received =
                numberValue(
                    item.Received ??
                    item.received
                );


            let status =
                "Pending";


            let statusClass =
                "pending";


            if (
                expected > 0 &&
                received >= expected
            ) {

                status =
                    "Received";

                statusClass =
                    "received";

            }


            transactions.push({

                type: "Income",

                date:
                    item.Date ??
                    item.date,

                description:
                    item.Name ??
                    item.name ??
                    "Income",

                category:
                    item.Category ??
                    item.category ??
                    "—",

                amount:
                    received,

                status,

                statusClass

            });

        });


    /* ---------------- EXPENSE ---------------- */

    (App.data.expenses || [])
        .forEach(item => {

            transactions.push({

                type: "Expense",

                date:
                    item.Date ??
                    item.date,

                description:
                    item.Description ??
                    item.description ??
                    "Expense",

                category:
                    item.Category ??
                    item.category ??
                    "—",

                amount:
                    numberValue(
                        item.Amount ??
                        item.amount
                    ),

                status:
                    "Paid",

                statusClass:
                    "paid"

            });

        });


    /* ---------------- RENTAL ---------------- */

    (App.data.rentals || [])
        .forEach(item => {

            const amount =
                numberValue(
                    item.Amount ??
                    item.amount
                );


            const paid =
                numberValue(
                    item.Paid ??
                    item.paid
                );


            let status =
                "Pending";


            let statusClass =
                "pending";


            if (
                amount > 0 &&
                paid >= amount
            ) {

                status =
                    "Paid";

                statusClass =
                    "paid";

            }


            transactions.push({

                type: "Rental",

                date:
                    item.Date ??
                    item.date,

                description:
                    item.Description ??
                    item.description ??
                    "Rental",

                category:
                    item.Category ??
                    item.category ??
                    "—",

                amount:
                    paid,

                status,

                statusClass

            });

        });


    /* ---------------- TRANSPORT ---------------- */

    (App.data.transport || [])
        .forEach(item => {

            const amount =
                numberValue(
                    item.Amount ??
                    item.amount
                );


            const paid =
                numberValue(
                    item.Paid ??
                    item.paid
                );


            let status =
                "Pending";


            let statusClass =
                "pending";


            if (
                amount > 0 &&
                paid >= amount
            ) {

                status =
                    "Paid";

                statusClass =
                    "paid";

            }


            transactions.push({

                type: "Transport",

                date:
                    item.Date ??
                    item.date,

                description:
                    item.Description ??
                    item.description ??
                    "Transport",

                category:
                    item.Category ??
                    item.category ??
                    "—",

                amount:
                    paid,

                status,

                statusClass

            });

        });


    transactions.sort(
        (a, b) => {

            const dateA =
                new Date(
                    a.date || 0
                ).getTime();


            const dateB =
                new Date(
                    b.date || 0
                ).getTime();


            return dateB - dateA;

        }
    );


    if (countElement) {

        countElement.textContent =
            transactions.length;

    }


    if (
        transactions.length === 0
    ) {

        container.innerHTML = `

            <div class="transaction-empty-state">

                <div class="transaction-empty-icon">
                    ₹
                </div>

                <div>

                    <h4>
                        No transactions yet
                    </h4>

                    <p>
                        Finance transactions will appear here
                        once income or outgoing records are added.
                    </p>

                </div>

            </div>

        `;

        return;

    }


    const recentTransactions =
        transactions.slice(
            0,
            10
        );


    let html = `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Status</th>

                    </tr>

                </thead>

                <tbody>

    `;


    recentTransactions.forEach(
        transaction => {

            html += `

                <tr>

                    <td>
                        ${formatDate(
                            transaction.date
                        )}
                    </td>

                    <td>

                        <span class="transaction-type">

                            ${escapeHtml(
                                transaction.type
                            )}

                        </span>

                    </td>

                    <td>
                        ${escapeHtml(
                            transaction.description
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            transaction.category
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            transaction.amount
                        )}
                    </td>

                    <td>

                        <span
                            class="transaction-status ${transaction.statusClass}"
                        >

                            ${escapeHtml(
                                transaction.status
                            )}

                        </span>

                    </td>

                </tr>

            `;

        }
    );


    html += `

                </tbody>

            </table>

        </div>

    `;


    container.innerHTML =
        html;

}


/* =========================================================
   24. RENDER APPLICATION
   ========================================================= */

function renderApplication() {

    renderDashboard();

    renderIncomeSummary();
    renderIncomeTable();

    renderExpenseSummary();
    renderExpenseTable();

    renderRentalSummary();
    renderRentalTable();

    renderTransportSummary();
    renderTransportTable();

    renderRecentTransactions();

    updateAdminInterface();

}


/* =========================================================
   25. NAVIGATION
   ========================================================= */

function navigateTo(page) {

    if (!page) {
        return;
    }


    App.currentPage =
        page;


    $$("[data-page]")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        });


    $$(".page-section")
        .forEach(section => {

            section.classList.toggle(
                "active",
                section.id === `${page}Page`
            );

        });


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });


    if (page === "dashboard") {

        loadDashboard();

    }

}


/* =========================================================
   26. NAVIGATION EVENTS
   ========================================================= */

function initializeNavigation() {

    $$("[data-page]")
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    navigateTo(
                        this.dataset.page
                    );

                }
            );

        });

}


/* =========================================================
   27. LOGIN MODAL
   ========================================================= */

function openLoginModal() {

    const modal =
        $("#loginModal");

    if (!modal) {
        return;
    }


    modal.classList.add(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    const email =
        $("#adminEmail");


    if (email) {

        setTimeout(
            () => email.focus(),
            100
        );

    }

}


function closeLoginModal() {

    const modal =
        $("#loginModal");

    if (!modal) {
        return;
    }


    modal.classList.remove(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* =========================================================
   28. ADMIN LOGIN
   ========================================================= */

async function adminLogin(
    email,
    password
) {

    try {

        const result =
            await apiPost({

                action:
                    "login",

                email:
                    email,

                password:
                    password

            });


        console.log(
            "Login response:",
            result
        );


        if (
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Invalid email or password."
            );

        }


        App.isAdmin =
            true;


        App.adminToken =
            result.token ||
            null;


        if (App.adminToken) {

            sessionStorage.setItem(
                "df_admin_token",
                App.adminToken
            );

        }


        if (
            result.expiresAt
        ) {

            sessionStorage.setItem(
                "df_admin_token_expiry",
                result.expiresAt
            );

        }


        setAdminMode(
            true
        );


        closeLoginModal();


        const form =
            $("#loginForm");


        if (form) {
            form.reset();
        }


        showLoginMessage(
            ""
        );


        await loadAllData();


        return true;

    }
    catch (error) {

        console.error(
            "Admin login error:",
            error
        );


        showLoginMessage(
            error.message ||
            "Unable to login.",
            true
        );


        return false;

    }

}


/* =========================================================
   29. ADMIN LOGOUT
   ========================================================= */

async function adminLogout() {

    const token =
        App.adminToken ||
        sessionStorage.getItem(
            "df_admin_token"
        );


    try {

        if (token) {

            await apiPost({

                action:
                    "logout",

                token:
                    token

            });

        }

    }
    catch (error) {

        console.warn(
            "Logout API warning:",
            error
        );

    }


    App.isAdmin =
        false;


    App.adminToken =
        null;


    sessionStorage.removeItem(
        "df_admin_token"
    );


    sessionStorage.removeItem(
        "df_admin_token_expiry"
    );


    setAdminMode(
        false
    );


    renderApplication();

}


/* =========================================================
   30. ADMIN MODE
   ========================================================= */

function setAdminMode(enabled) {

    App.isAdmin =
        Boolean(enabled);


    document.body.classList.toggle(
        "admin-mode",
        App.isAdmin
    );


    const loginButton =
        $("#loginButton");


    if (loginButton) {

        loginButton.textContent =
            App.isAdmin
                ? "Logout"
                : "Admin Login";

    }


    setConnectionStatus(
        App.isAdmin
            ? "Admin Mode"
            : "Connected",
        "online"
    );


    updateAdminInterface();

}


/* =========================================================
   31. ADMIN UI
   ========================================================= */

function updateAdminInterface() {

    $$(".admin-only")
        .forEach(element => {

            element.style.display =
                App.isAdmin
                    ? ""
                    : "none";

        });

}


/* =========================================================
   32. LOGIN MESSAGE
   ========================================================= */

function showLoginMessage(
    message,
    isError = false
) {

    const element =
        $("#loginMessage");


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.classList.toggle(
        "error",
        isError
    );

}


/* =========================================================
   33. LOGIN INITIALIZATION
   ========================================================= */

function initializeLogin() {

    const button =
        $("#loginButton");


    if (button) {

        button.addEventListener(
            "click",
            function () {

                if (App.isAdmin) {

                    adminLogout();

                }
                else {

                    openLoginModal();

                }

            }
        );

    }


    const form =
        $("#loginForm");


    if (form) {

        form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const email =
                    $("#adminEmail")
                        ?.value
                        .trim();


                const password =
                    $("#adminPassword")
                        ?.value;


                if (
                    !email ||
                    !password
                ) {

                    showLoginMessage(
                        "Please enter your email and password.",
                        true
                    );

                    return;

                }


                showLoginMessage(
                    "Signing in..."
                );


                await adminLogin(
                    email,
                    password
                );

            }
        );

    }


    const closeButton =
        $("#closeLoginModal");


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeLoginModal
        );

    }


    const modal =
        $("#loginModal");


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target.classList.contains(
                        "modal-overlay"
                    )
                ) {

                    closeLoginModal();

                }

            }
        );

    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                closeLoginModal();

            }

        }
    );

}


/* =========================================================
   34. RESTORE ADMIN SESSION
   ========================================================= */

function restoreAdminSession() {

    const token =
        sessionStorage.getItem(
            "df_admin_token"
        );


    if (!token) {

        setAdminMode(
            false
        );

        return;

    }


    const expiry =
        sessionStorage.getItem(
            "df_admin_token_expiry"
        );


    if (
        expiry &&
        !Number.isNaN(
            Number(expiry)
        )
    ) {

        if (
            Date.now() >
            Number(expiry)
        ) {

            sessionStorage.removeItem(
                "df_admin_token"
            );

            sessionStorage.removeItem(
                "df_admin_token_expiry"
            );

            setAdminMode(
                false
            );

            return;

        }

    }


    App.adminToken =
        token;


    setAdminMode(
        true
    );

}


/* =========================================================
   35. QUICK ACCESS
   ========================================================= */

function initializeQuickAccess() {

    /*
       Quick Access buttons use data-page.
       Navigation is already initialized
       by initializeNavigation().
    */

}


/* =========================================================
   36. ADMIN FORM MODAL
   ========================================================= */

function createAdminFormModal() {

    let modal =
        $("#adminFormModal");


    if (modal) {
        return modal;
    }


    modal =
        document.createElement(
            "div"
        );


    modal.id =
        "adminFormModal";


    modal.className =
        "modal";


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    modal.innerHTML = `

        <div class="modal-overlay">

            <div
                class="modal-box admin-form-modal-box"
                role="dialog"
                aria-modal="true"
            >

                <button
                    type="button"
                    class="modal-close"
                    id="closeAdminFormModal"
                    aria-label="Close"
                >
                    ×
                </button>

                <div id="adminFormContent"></div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const closeButton =
        $("#closeAdminFormModal");


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeAdminFormModal
        );

    }


    modal.addEventListener(
        "click",
        function (event) {

            if (
                event.target.classList.contains(
                    "modal-overlay"
                )
            ) {

                closeAdminFormModal();

            }

        }
    );


    return modal;

}


/* =========================================================
   37. FORM FIELD
   ========================================================= */

function formInput(
    id,
    label,
    type = "text",
    required = false,
    value = "",
    placeholder = ""
) {

    return `

        <div class="admin-form-field">

            <label for="${id}">
                ${escapeHtml(label)}
                ${
                    required
                        ? " *"
                        : ""
                }
            </label>

            <input
                id="${id}"
                name="${id}"
                type="${type}"
                value="${escapeHtml(value)}"
                placeholder="${escapeHtml(placeholder)}"
                ${required ? "required" : ""}
            />

        </div>

    `;

}


function formSelect(
    id,
    label,
    options,
    required = false,
    selected = ""
) {

    return `

        <div class="admin-form-field">

            <label for="${id}">
                ${escapeHtml(label)}
                ${
                    required
                        ? " *"
                        : ""
                }
            </label>

            <select
                id="${id}"
                name="${id}"
                ${required ? "required" : ""}
            >

                <option value="">
                    Select ${escapeHtml(label)}
                </option>

                ${options.map(
                    option => `

                        <option
                            value="${escapeHtml(option)}"
                            ${
                                selected === option
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${escapeHtml(option)}
                        </option>

                    `
                ).join("")}

            </select>

        </div>

    `;

}


function formTextarea(
    id,
    label,
    value = "",
    placeholder = ""
) {

    return `

        <div class="admin-form-field admin-form-full">

            <label for="${id}">
                ${escapeHtml(label)}
            </label>

            <textarea
                id="${id}"
                name="${id}"
                rows="4"
                placeholder="${escapeHtml(placeholder)}"
            >${escapeHtml(value)}</textarea>

        </div>

    `;

}


/* =========================================================
   38. OPEN ADD FORM
   ========================================================= */

function openAddForm(type) {

    if (!App.isAdmin) {

        alert(
            "Please login as administrator first."
        );

        return;

    }


    App.formType =
        type;


    const modal =
        createAdminFormModal();


    const content =
        $("#adminFormContent");


    if (!content) {
        return;
    }


    let title =
        "";


    let form =
        "";


    const today =
        todayForInput();


    /* =====================================================
       INCOME
       ===================================================== */

    if (type === "income") {

        title =
            "Add Income";


        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                <div class="admin-form-header">

                    <span>
                        DUSSEHRA FINANCE
                    </span>

                    <h2>
                        Add Income
                    </h2>

                    <p>
                        Enter the income received or expected.
                    </p>

                </div>


                <div class="admin-form-grid">

                    ${formInput(
                        "recordDate",
                        "Date",
                        "date",
                        true,
                        today
                    )}


                    ${formInput(
                        "recordName",
                        "Name",
                        "text",
                        true,
                        "",
                        "Sponsor / contributor name"
                    )}


                    ${formInput(
                        "recordCategory",
                        "Category",
                        "text",
                        true,
                        "",
                        "Sponsorship / Contribution / Other"
                    )}


                    ${formInput(
                        "recordExpected",
                        "Expected Amount",
                        "number",
                        true,
                        "",
                        "0.00"
                    )}


                    ${formInput(
                        "recordReceived",
                        "Received Amount",
                        "number",
                        true,
                        "",
                        "0.00"
                    )}


                    ${formSelect(
                        "recordPaymentMode",
                        "Payment Mode",
                        [
                            "Cash",
                            "UPI",
                            "Bank Transfer",
                            "Cheque",
                            "Other"
                        ],
                        true
                    )}

                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        "",
                        "Optional notes"
                    )}

                </div>


                <div
                    id="adminFormMessage"
                    class="admin-form-message"
                ></div>


                <div class="admin-form-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        id="cancelAdminForm"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Save Income
                    </button>

                </div>

            </form>

        `;

    }


    /* =====================================================
       EXPENSE
       ===================================================== */

    else if (type === "expense") {

        title =
            "Add Expense";


        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                <div class="admin-form-header">

                    <span>
                        DUSSEHRA FINANCE
                    </span>

                    <h2>
                        Add Expense
                    </h2>

                    <p>
                        Record festival expenses.
                    </p>

                </div>


                <div class="admin-form-grid">

                    ${formInput(
                        "recordDate",
                        "Date",
                        "date",
                        true,
                        today
                    )}


                    ${formInput(
                        "recordDescription",
                        "Description",
                        "text",
                        true,
                        "",
                        "Example: Food supplies"
                    )}


                    ${formInput(
                        "recordCategory",
                        "Category",
                        "text",
                        true,
                        "",
                        "Food / Decoration / Pooja / Other"
                    )}


                    ${formInput(
                        "recordAmount",
                        "Amount",
                        "number",
                        true,
                        "",
                        "0.00"
                    )}


                    ${formSelect(
                        "recordPaymentMode",
                        "Payment Mode",
                        [
                            "Cash",
                            "UPI",
                            "Bank Transfer",
                            "Cheque",
                            "Other"
                        ],
                        true
                    )}


                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        "",
                        "Optional notes"
                    )}

                </div>


                <div
                    id="adminFormMessage"
                    class="admin-form-message"
                ></div>


                <div class="admin-form-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        id="cancelAdminForm"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Save Expense
                    </button>

                </div>

            </form>

        `;

    }


    /* =====================================================
       RENTAL
       ===================================================== */

    else if (type === "rental") {

        title =
            "Add Rental";


        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                <div class="admin-form-header">

                    <span>
                        DUSSEHRA FINANCE
                    </span>

                    <h2>
                        Add Rental
                    </h2>

                    <p>
                        Record rented items and payments.
                    </p>

                </div>


                <div class="admin-form-grid">

                    ${formInput(
                        "recordDate",
                        "Date",
                        "date",
                        true,
                        today
                    )}


                    ${formInput(
                        "recordDescription",
                        "Description",
                        "text",
                        true,
                        "",
                        "Example: Cooking vessels"
                    )}


                    ${formInput(
                        "recordCategory",
                        "Category",
                        "text",
                        true,
                        "",
                        "Vessels / Equipment / Other"
                    )}


                    ${formInput(
                        "recordAmount",
                        "Total Amount",
                        "number",
                        true,
                        "",
                        "0.00"
                    )}


                    ${formInput(
                        "recordPaid",
                        "Paid Amount",
                        "number",
                        true,
                        "",
                        "0.00"
                    )}


                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        "",
                        "Optional notes"
                    )}

                </div>


                <div
                    id="adminFormMessage"
                    class="admin-form-message"
                ></div>


                <div class="admin-form-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        id="cancelAdminForm"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Save Rental
                    </button>

                </div>

            </form>

        `;

    }


    /* =====================================================
       TRANSPORT
       ===================================================== */

    else if (type === "transport") {

        title =
            "Add Transport";


        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                <div class="admin-form-header">

                    <span>
                        DUSSEHRA FINANCE
                    </span>

                    <h2>
                        Add Transport
                    </h2>

                    <p>
                        Record festival transportation costs.
                    </p>

                </div>


                <div class="admin-form-grid">

                    ${formInput(
                        "recordDate",
                        "Date",
                        "date",
                        true,
                        today
                    )}


                    ${formInput(
                        "recordDescription",
                        "Description",
                        "text",
                        true,
                        "",
                        "Example: Idol transportation"
                    )}


                    ${formInput(
                        "recordCategory",
                        "Category",
                        "text",
                        true,
                        "",
                        "Idol / Materials / People / Other"
                    )}


                    ${formInput(
                        "recordAmount",
                        "Total Amount",
                        "number",
                        true,
                        "",
                        "0.00"
                    )}


                    ${formInput(
                        "recordPaid",
                        "Paid Amount",
                        "number",
                        true,
                        "",
                        "0.00"
                    )}


                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        "",
                        "Optional notes"
                    )}

                </div>


                <div
                    id="adminFormMessage"
                    class="admin-form-message"
                ></div>


                <div class="admin-form-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        id="cancelAdminForm"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Save Transport
                    </button>

                </div>

            </form>

        `;

    }


    content.innerHTML =
        form;


    modal.classList.add(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    initializeAdminRecordForm();


    setTimeout(
        () => {

            const firstInput =
                content.querySelector(
                    "input"
                );

            if (firstInput) {
                firstInput.focus();
            }

        },
        100
    );

}


/* =========================================================
   39. CLOSE ADMIN FORM
   ========================================================= */

function closeAdminFormModal() {

    const modal =
        $("#adminFormModal");

    if (!modal) {
        return;
    }


    modal.classList.remove(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    App.formType =
        null;

}


/* =========================================================
   40. INITIALIZE ADD BUTTONS
   ========================================================= */

function initializeAddButtons() {

    const incomeButton =
        $("#addIncomeButton");


    if (incomeButton) {

        incomeButton.addEventListener(
            "click",
            function () {

                openAddForm(
                    "income"
                );

            }
        );

    }


    const expenseButton =
        $("#addExpenseButton");


    if (expenseButton) {

        expenseButton.addEventListener(
            "click",
            function () {

                openAddForm(
                    "expense"
                );

            }
        );

    }


    const rentalButton =
        $("#addRentalButton");


    if (rentalButton) {

        rentalButton.addEventListener(
            "click",
            function () {

                openAddForm(
                    "rental"
                );

            }
        );

    }


    const transportButton =
        $("#addTransportButton");


    if (transportButton) {

        transportButton.addEventListener(
            "click",
            function () {

                openAddForm(
                    "transport"
                );

            }
        );

    }

}


/* =========================================================
   41. INITIALIZE ADMIN RECORD FORM
   ========================================================= */

function initializeAdminRecordForm() {

    const form =
        $("#adminRecordForm");


    if (!form) {
        return;
    }


    const cancelButton =
        $("#cancelAdminForm");


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeAdminFormModal
        );

    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            await submitAdminRecord();

        }
    );

}


/* =========================================================
   42. SHOW FORM MESSAGE
   ========================================================= */

function showAdminFormMessage(
    message,
    isError = false
) {

    const element =
        $("#adminFormMessage");


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.classList.toggle(
        "error",
        isError
    );

}


/* =========================================================
   43. SUBMIT ADMIN RECORD
   ========================================================= */

async function submitAdminRecord() {

    if (!App.isAdmin) {

        showAdminFormMessage(
            "Your admin session has expired. Please login again.",
            true
        );

        return;

    }


    const form =
        $("#adminRecordForm");


    if (!form) {
        return;
    }


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "Saving...";

    }


    try {

        const type =
            App.formType;


        let payload = {

            token:
                App.adminToken

        };


        /* =================================================
           INCOME
           ================================================= */

        if (type === "income") {

            const expected =
                numberValue(
                    $("#recordExpected")?.value
                );


            const received =
                numberValue(
                    $("#recordReceived")?.value
                );


            if (received > expected) {

                throw new Error(
                    "Received amount cannot be greater than expected amount."
                );

            }


            payload = {

                ...payload,

                action:
                    "addIncome",

                date:
                    $("#recordDate").value,

                name:
                    $("#recordName").value.trim(),

                category:
                    $("#recordCategory").value.trim(),

                expected:
                    expected,

                received:
                    received,

                paymentMode:
                    $("#recordPaymentMode").value,

                notes:
                    $("#recordNotes").value.trim()

            };

        }


        /* =================================================
           EXPENSE
           ================================================= */

        else if (type === "expense") {

            const amount =
                numberValue(
                    $("#recordAmount")?.value
                );


            payload = {

                ...payload,

                action:
                    "addExpense",

                date:
                    $("#recordDate").value,

                description:
                    $("#recordDescription").value.trim(),

                category:
                    $("#recordCategory").value.trim(),

                amount:
                    amount,

                paymentMode:
                    $("#recordPaymentMode").value,

                notes:
                    $("#recordNotes").value.trim()

            };

        }


        /* =================================================
           RENTAL
           ================================================= */

        else if (type === "rental") {

            const amount =
                numberValue(
                    $("#recordAmount")?.value
                );


            const paid =
                numberValue(
                    $("#recordPaid")?.value
                );


            if (paid > amount) {

                throw new Error(
                    "Paid amount cannot be greater than total rental amount."
                );

            }


            payload = {

                ...payload,

                action:
                    "addRental",

                date:
                    $("#recordDate").value,

                description:
                    $("#recordDescription").value.trim(),

                category:
                    $("#recordCategory").value.trim(),

                amount:
                    amount,

                paid:
                    paid,

                notes:
                    $("#recordNotes").value.trim()

            };

        }


        /* =================================================
           TRANSPORT
           ================================================= */

        else if (type === "transport") {

            const amount =
                numberValue(
                    $("#recordAmount")?.value
                );


            const paid =
                numberValue(
                    $("#recordPaid")?.value
                );


            if (paid > amount) {

                throw new Error(
                    "Paid amount cannot be greater than total transport amount."
                );

            }


            payload = {

                ...payload,

                action:
                    "addTransport",

                date:
                    $("#recordDate").value,

                description:
                    $("#recordDescription").value.trim(),

                category:
                    $("#recordCategory").value.trim(),

                amount:
                    amount,

                paid:
                    paid,

                notes:
                    $("#recordNotes").value.trim()

            };

        }


        else {

            throw new Error(
                "Unknown record type."
            );

        }


        /* =================================================
           VALIDATION
           ================================================= */

        if (!payload.date) {

            throw new Error(
                "Please select a date."
            );

        }


        if (
            type === "income" &&
            !payload.name
        ) {

            throw new Error(
                "Please enter the income name."
            );

        }


        if (
            type !== "income" &&
            !payload.description
        ) {

            throw new Error(
                "Please enter a description."
            );

        }


        if (!payload.category) {

            throw new Error(
                "Please enter a category."
            );

        }


        /* =================================================
           SEND TO GOOGLE APPS SCRIPT
           ================================================= */

        showAdminFormMessage(
            "Saving record..."
        );


        const result =
            await apiPost(
                payload
            );


        console.log(
            "Save response:",
            result
        );


        showAdminFormMessage(
            "Record saved successfully."
        );


        /* =================================================
           REFRESH DATA
           ================================================= */

        await loadAllData();


        /* =================================================
           CLOSE AFTER SHORT DELAY
           ================================================= */

        setTimeout(
            () => {

                closeAdminFormModal();

            },
            600
        );

    }
    catch (error) {

        console.error(
            "Save record error:",
            error
        );


        showAdminFormMessage(
            error.message ||
            "Unable to save record.",
            true
        );


        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                getSaveButtonText(
                    App.formType
                );

        }

    }

}


/* =========================================================
   44. SAVE BUTTON TEXT
   ========================================================= */

function getSaveButtonText(type) {

    if (type === "income") {
        return "Save Income";
    }

    if (type === "expense") {
        return "Save Expense";
    }

    if (type === "rental") {
        return "Save Rental";
    }

    if (type === "transport") {
        return "Save Transport";
    }

    return "Save";

}


/* =========================================================
   45. EDIT RECORD
   ========================================================= */

function openEditForm(
    type,
    id
) {

    if (!App.isAdmin) {
        return;
    }


    let collection;


    if (type === "income") {

        collection =
            App.data.income;

    }
    else if (type === "expense") {

        collection =
            App.data.expenses;

    }
    else if (type === "rental") {

        collection =
            App.data.rentals;

    }
    else if (type === "transport") {

        collection =
            App.data.transport;

    }
    else {

        return;

    }


    const item =
        collection.find(
            record =>
                String(
                    record.ID
                ) === String(id)
        );


    if (!item) {

        alert(
            "Record not found."
        );

        return;

    }


    App.formType =
        type;


    const modal =
        createAdminFormModal();


    const content =
        $("#adminFormContent");


    if (!content) {
        return;
    }


    const date =
        normalizeDateForInput(
            item.Date
        );


    let form =
        "";


    if (type === "income") {

        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                <div class="admin-form-header">

                    <span>
                        DUSSEHRA FINANCE
                    </span>

                    <h2>
                        Edit Income
                    </h2>

                    <p>
                        Update this income record.
                    </p>

                </div>


                <div class="admin-form-grid">

                    ${formInput(
                        "recordDate",
                        "Date",
                        "date",
                        true,
                        date
                    )}

                    ${formInput(
                        "recordName",
                        "Name",
                        "text",
                        true,
                        item.Name || ""
                    )}

                    ${formInput(
                        "recordCategory",
                        "Category",
                        "text",
                        true,
                        item.Category || ""
                    )}

                    ${formInput(
                        "recordExpected",
                        "Expected Amount",
                        "number",
                        true,
                        item.Expected || ""
                    )}

                    ${formInput(
                        "recordReceived",
                        "Received Amount",
                        "number",
                        true,
                        item.Received || ""
                    )}

                    ${formSelect(
                        "recordPaymentMode",
                        "Payment Mode",
                        [
                            "Cash",
                            "UPI",
                            "Bank Transfer",
                            "Cheque",
                            "Other"
                        ],
                        true,
                        item.PaymentMode || ""
                    )}

                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        item.Notes || ""
                    )}

                </div>


                <div
                    id="adminFormMessage"
                    class="admin-form-message"
                ></div>


                <div class="admin-form-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        id="cancelAdminForm"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        Update Income
                    </button>

                </div>

            </form>

        `;

    }
    else {

        const isRental =
            type === "rental";


        const title =
            isRental
                ? "Edit Rental"
                : "Edit Transport";


        const saveText =
            isRental
                ? "Update Rental"
                : "Update Transport";


        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                <div class="admin-form-header">

                    <span>
                        DUSSEHRA FINANCE
                    </span>

                    <h2>
                        ${title}
                    </h2>

                    <p>
                        Update this record.
                    </p>

                </div>


                <div class="admin-form-grid">

                    ${formInput(
                        "recordDate",
                        "Date",
                        "date",
                        true,
                        date
                    )}

                    ${formInput(
                        "recordDescription",
                        "Description",
                        "text",
                        true,
                        item.Description || ""
                    )}

                    ${formInput(
                        "recordCategory",
                        "Category",
                        "text",
                        true,
                        item.Category || ""
                    )}

                    ${formInput(
                        "recordAmount",
                        "Total Amount",
                        "number",
                        true,
                        item.Amount || ""
                    )}

                    ${formInput(
                        "recordPaid",
                        "Paid Amount",
                        "number",
                        true,
                        item.Paid || ""
                    )}

                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        item.Notes || ""
                    )}

                </div>


                <div
                    id="adminFormMessage"
                    class="admin-form-message"
                ></div>


                <div class="admin-form-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        id="cancelAdminForm"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="primary-button"
                    >
                        ${saveText}
                    </button>

                </div>

            </form>

        `;

    }


    content.innerHTML =
        form;


    modal.classList.add(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    initializeEditRecordForm(
        type,
        id
    );

}


/* =========================================================
   46. EDIT FORM SUBMIT
   ========================================================= */

function initializeEditRecordForm(
    type,
    id
) {

    const form =
        $("#adminRecordForm");


    if (!form) {
        return;
    }


    const cancel =
        $("#cancelAdminForm");


    if (cancel) {

        cancel.addEventListener(
            "click",
            closeAdminFormModal
        );

    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const submitButton =
                form.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Updating...";

            }


            try {

                let payload = {

                    action:
                        getUpdateAction(
                            type
                        ),

                    token:
                        App.adminToken,

                    id:
                        id,

                    date:
                        $("#recordDate").value,

                    notes:
                        $("#recordNotes").value.trim()

                };


                if (type === "income") {

                    payload.name =
                        $("#recordName").value.trim();

                    payload.category =
                        $("#recordCategory").value.trim();

                    payload.expected =
                        numberValue(
                            $("#recordExpected").value
                        );

                    payload.received =
                        numberValue(
                            $("#recordReceived").value
                        );

                    payload.paymentMode =
                        $("#recordPaymentMode").value;

                }
                else {

                    payload.description =
                        $("#recordDescription").value.trim();

                    payload.category =
                        $("#recordCategory").value.trim();

                    payload.amount =
                        numberValue(
                            $("#recordAmount").value
                        );

                    payload.paid =
                        numberValue(
                            $("#recordPaid").value
                        );

                }


                showAdminFormMessage(
                    "Updating record..."
                );


                await apiPost(
                    payload
                );


                showAdminFormMessage(
                    "Record updated successfully."
                );


                await loadAllData();


                setTimeout(
                    closeAdminFormModal,
                    600
                );

            }
            catch (error) {

                console.error(
                    "Update error:",
                    error
                );


                showAdminFormMessage(
                    error.message ||
                    "Unable to update record.",
                    true
                );


                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        getUpdateButtonText(
                            type
                        );

                }

            }

        }
    );

}


/* =========================================================
   47. UPDATE ACTION
   ========================================================= */

function getUpdateAction(type) {

    if (type === "income") {
        return "updateIncome";
    }

    if (type === "expense") {
        return "updateExpense";
    }

    if (type === "rental") {
        return "updateRental";
    }

    if (type === "transport") {
        return "updateTransport";
    }

    return "";

}


function getUpdateButtonText(type) {

    if (type === "income") {
        return "Update Income";
    }

    if (type === "expense") {
        return "Update Expense";
    }

    if (type === "rental") {
        return "Update Rental";
    }

    if (type === "transport") {
        return "Update Transport";
    }

    return "Update";

}


/* =========================================================
   48. DELETE RECORD
   ========================================================= */

async function deleteRecord(
    type,
    id
) {

    if (!App.isAdmin) {

        alert(
            "Please login as administrator."
        );

        return;

    }


    const confirmed =
        window.confirm(
            `Are you sure you want to delete ${type} record ${id}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        await apiPost({

            action:
                getDeleteAction(
                    type
                ),

            token:
                App.adminToken,

            id:
                id

        });


        await loadAllData();


        alert(
            "Record deleted successfully."
        );

    }
    catch (error) {

        console.error(
            "Delete error:",
            error
        );


        alert(
            error.message ||
            "Unable to delete record."
        );

    }

}


/* =========================================================
   49. DELETE ACTION
   ========================================================= */

function getDeleteAction(type) {

    if (type === "income") {
        return "deleteIncome";
    }

    if (type === "expense") {
        return "deleteExpense";
    }

    if (type === "rental") {
        return "deleteRental";
    }

    if (type === "transport") {
        return "deleteTransport";
    }

    return "";

}


/* =========================================================
   50. RECORD ACTION BUTTONS
   ========================================================= */

function initializeRecordActions() {

    $$(".edit-record-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    openEditForm(
                        this.dataset.type,
                        this.dataset.id
                    );

                }
            );

        });


    $$(".delete-record-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    deleteRecord(
                        this.dataset.type,
                        this.dataset.id
                    );

                }
            );

        });

}


/* =========================================================
   51. DATE NORMALIZER
   ========================================================= */

function normalizeDateForInput(
    value
) {

    if (!value) {
        return todayForInput();
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        if (
            /^\d{4}-\d{2}-\d{2}$/.test(
                String(value)
            )
        ) {

            return String(value);

        }


        return todayForInput();

    }


    return [

        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(2, "0"),

        String(
            date.getDate()
        ).padStart(2, "0")

    ].join("-");

}


/* =========================================================
   52. AUTO REFRESH
   ========================================================= */

function initializeAutoRefresh() {

    setInterval(
        async function () {

            if (
                document.hidden ||
                App.loading ||
                $("#adminFormModal")?.classList.contains("open")
            ) {

                return;

            }


            await loadAllData();

        },
        CONFIG.REFRESH_INTERVAL
    );

}


/* =========================================================
   53. ESCAPE ADMIN FORM
   ========================================================= */

function initializeGlobalEscape() {

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !== "Escape"
            ) {
                return;
            }


            const adminModal =
                $("#adminFormModal");


            if (
                adminModal &&
                adminModal.classList.contains(
                    "open"
                )
            ) {

                closeAdminFormModal();

            }

        }
    );

}


/* =========================================================
   54. START APPLICATION
   ========================================================= */

async function initializeApp() {

    initializeNavigation();

    initializeLogin();

    initializeQuickAccess();

    initializeAddButtons();

    initializeGlobalEscape();

    restoreAdminSession();

    navigateTo(
        "dashboard"
    );

    await loadAllData();

    initializeAutoRefresh();

}


/* =========================================================
   55. DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);