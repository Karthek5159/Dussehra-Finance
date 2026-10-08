/* =========================================================
   DUSSEHRA FINANCE — APPLICATION JAVASCRIPT
   Google Apps Script Backend
   Version: Enhanced 2026
   ========================================================= */

"use strict";


/* =========================================================
   1. CONFIGURATION
   ========================================================= */

const CONFIG = {

    API_URL:
        "https://script.google.com/macros/s/AKfycbxXHyO95LALy-jEUe-hUlgV1VOOhfOHCLIwWzW2yqsZT8N_XOjFqIC0fMYi4b5tLCgh/exec",

    REFRESH_INTERVAL: 60000,

    MAX_RECENT_ITEMS: 10,

    MAX_TABLE_ITEMS: 500

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

    editingId: null,

    refreshTimer: null,

    data: {

        festival: {
            name: "Dussehra Finance 2026",
            year: 2026
        },

        income: [],

        expenses: [],

        rentals: [],

        transport: [],

        budget: [],

        sponsors: [],

        donations: []

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

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    const number =
        Number(
            String(value)
                .replace(/,/g, "")
                .replace(/₹/g, "")
                .trim()
        );

    return Number.isFinite(number)
        ? number
        : 0;

}


function firstValue(item, keys, fallback = "") {

    if (!item) {
        return fallback;
    }

    for (const key of keys) {

        if (
            item[key] !== undefined &&
            item[key] !== null &&
            item[key] !== ""
        ) {

            return item[key];

        }

    }

    return fallback;

}


function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(
        numberValue(value)
    );

}


function formatNumber(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    ).format(
        numberValue(value)
    );

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

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

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

    const date =
        new Date();

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


function normalizeDateForInput(value) {

    if (!value) {
        return todayForInput();
    }

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            String(value)
        )
    ) {

        return String(value);

    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

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


function recordId(item) {

    return String(
        firstValue(
            item,
            [
                "ID",
                "Id",
                "id",
                "RecordID",
                "recordId"
            ],
            ""
        )
    );

}


function recordDate(item) {

    return firstValue(
        item,
        [
            "Date",
            "date",
            "DonationDate",
            "donationDate"
        ],
        ""
    );

}


function recordAmount(item) {

    return numberValue(
        firstValue(
            item,
            [
                "Amount",
                "amount",
                "Total",
                "total",
                "ActualPaid",
                "actualPaid"
            ],
            0
        )
    );

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

    if (!CONFIG.API_URL) {

        throw new Error(
            "API URL is not configured."
        );

    }

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

    if (!CONFIG.API_URL) {

        throw new Error(
            "API URL is not configured."
        );

    }


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

    if (App.loading) {
        return false;
    }


    setConnectionStatus(
        "Syncing...",
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


        /*
           New modules.
           If the backend has not yet added these
           arrays, the application simply uses [].
        */

        App.data.sponsors =
            Array.isArray(result.sponsors)
                ? result.sponsors
                : [];


        App.data.donations =
            Array.isArray(result.donations)
                ? result.donations
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


        /*
           Keep dashboard API support,
           but also refresh new module values
           from local data when available.
        */

        renderDashboardFromApi(
            result
        );


        renderDashboardExtra();


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


        /*
           Dashboard endpoint may not yet expose
           the new modules. Local rendering remains
           available.
        */

        renderDashboard();

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


function clearApplicationError() {

    const element =
        $("#applicationError");

    if (element) {
        element.remove();
    }

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
                    firstValue(
                        item,
                        [
                            "Expected",
                            "expected",
                            "ExpectedAmount",
                            "expectedAmount",
                            "Amount",
                            "amount"
                        ],
                        0
                    )
                ),
            0
        );


    const receivedIncome =
        App.data.income.reduce(
            (total, item) =>
                total +
                numberValue(
                    firstValue(
                        item,
                        [
                            "Received",
                            "received",
                            "ReceivedAmount",
                            "receivedAmount"
                        ],
                        0
                    )
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
                recordAmount(item),
            0
        );


    const rentalTotal =
        App.data.rentals.reduce(
            (total, item) =>
                total +
                numberValue(
                    firstValue(
                        item,
                        [
                            "Amount",
                            "amount",
                            "ExpectedRent",
                            "expectedRent"
                        ],
                        0
                    )
                ),
            0
        );


    const rentalPaid =
        App.data.rentals.reduce(
            (total, item) =>
                total +
                numberValue(
                    firstValue(
                        item,
                        [
                            "Paid",
                            "paid",
                            "ActualPaid",
                            "actualPaid"
                        ],
                        0
                    )
                ),
            0
        );


    const transportTotal =
        App.data.transport.reduce(
            (total, item) =>
                total +
                numberValue(
                    firstValue(
                        item,
                        [
                            "Amount",
                            "amount",
                            "Total",
                            "total"
                        ],
                        0
                    )
                ),
            0
        );


    const transportPaid =
        App.data.transport.reduce(
            (total, item) =>
                total +
                numberValue(
                    firstValue(
                        item,
                        [
                            "Paid",
                            "paid",
                            "ActualPaid",
                            "actualPaid"
                        ],
                        0
                    )
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
                    firstValue(
                        item,
                        [
                            "Amount",
                            "amount",
                            "Budget",
                            "budget"
                        ],
                        0
                    )
                ),
            0
        );


    const sponsorExpected =
        App.data.sponsors.reduce(
            (total, item) =>
                total +
                numberValue(
                    firstValue(
                        item,
                        [
                            "Expected",
                            "expected",
                            "ExpectedAmount",
                            "expectedAmount",
                            "Amount",
                            "amount"
                        ],
                        0
                    )
                ),
            0
        );


    const sponsorReceived =
        App.data.sponsors.reduce(
            (total, item) =>
                total +
                numberValue(
                    firstValue(
                        item,
                        [
                            "Received",
                            "received",
                            "ReceivedAmount",
                            "receivedAmount",
                            "Paid",
                            "paid"
                        ],
                        0
                    )
                ),
            0
        );


    const sponsorPending =
        Math.max(
            sponsorExpected -
            sponsorReceived,
            0
        );


    /*
       Material donations are intentionally
       NOT included in cash income.
    */

    const materialDonationCount =
        App.data.donations.filter(
            item =>
                isMaterialDonation(item)
        ).length;


    const materialQuantity =
        App.data.donations.reduce(
            (total, item) => {

                if (
                    !isMaterialDonation(item)
                ) {
                    return total;
                }

                return total +
                    numberValue(
                        firstValue(
                            item,
                            [
                                "Quantity",
                                "quantity",
                                "Qty",
                                "qty"
                            ],
                            0
                        )
                    );

            },
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

        totalBudget,

        sponsorExpected,

        sponsorReceived,

        sponsorPending,

        sponsorCount:
            App.data.sponsors.length,

        donationCount:
            App.data.donations.length,

        materialDonationCount,

        materialQuantity

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
        App.data.festival?.name ||
        "Dussehra Finance 2026"
    );


    setText(
        "#totalIncome",
        formatCurrency(
            firstValue(
                summary,
                [
                    "totalIncome",
                    "totalExpectedIncome"
                ],
                calculateSummary().totalIncome
            )
        )
    );


    setText(
        "#receivedIncome",
        formatCurrency(
            firstValue(
                summary,
                [
                    "receivedIncome",
                    "totalReceivedIncome"
                ],
                calculateSummary().receivedIncome
            )
        )
    );


    setText(
        "#pendingIncome",
        formatCurrency(
            firstValue(
                summary,
                [
                    "pendingIncome",
                    "totalPendingIncome"
                ],
                calculateSummary().pendingIncome
            )
        )
    );


    setText(
        "#totalOutgoing",
        formatCurrency(
            firstValue(
                summary,
                [
                    "totalOutgoing",
                    "totalActualExpenses"
                ],
                calculateSummary().totalOutgoing
            )
        )
    );


    setText(
        "#cashBalance",
        formatCurrency(
            firstValue(
                summary,
                [
                    "cashBalance",
                    "balance"
                ],
                calculateSummary().cashBalance
            )
        )
    );


    setText(
        "#totalBudget",
        formatCurrency(
            firstValue(
                summary,
                [
                    "totalBudget",
                    "budget"
                ],
                calculateSummary().totalBudget
            )
        )
    );


    const local =
        calculateSummary();


    setText(
        "#expenseTotal",
        formatCurrency(
            firstValue(
                summary,
                [
                    "expenseTotal",
                    "totalExpenses"
                ],
                local.expenseTotal
            )
        )
    );


    setText(
        "#rentalTotal",
        formatCurrency(
            firstValue(
                summary,
                [
                    "rentalPaid",
                    "totalRentalPaid",
                    "rentalTotal"
                ],
                local.rentalPaid
            )
        )
    );


    setText(
        "#transportTotal",
        formatCurrency(
            firstValue(
                summary,
                [
                    "transportPaid",
                    "totalTransportPaid",
                    "transportTotal"
                ],
                local.transportPaid
            )
        )
    );


    setText(
        "#breakdownOutgoing",
        formatCurrency(
            firstValue(
                summary,
                [
                    "totalOutgoing",
                    "totalActualExpenses"
                ],
                local.totalOutgoing
            )
        )
    );


    renderDashboardExtra();

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
        App.data.festival?.name ||
        "Dussehra Finance 2026"
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


    renderDashboardExtra();

}


/* =========================================================
   15. DASHBOARD EXTRA / NEW FEATURES
   ========================================================= */

function renderDashboardExtra() {

    const summary =
        calculateSummary();


    /*
       These IDs are optional.
       If your dashboard HTML contains them,
       they will automatically populate.
    */

    setText(
        "#sponsorCount",
        summary.sponsorCount
    );


    setText(
        "#sponsorExpected",
        formatCurrency(
            summary.sponsorExpected
        )
    );


    setText(
        "#sponsorReceived",
        formatCurrency(
            summary.sponsorReceived
        )
    );


    setText(
        "#sponsorPending",
        formatCurrency(
            summary.sponsorPending
        )
    );


    setText(
        "#donationCount",
        summary.donationCount
    );


    setText(
        "#materialDonationCount",
        summary.materialDonationCount
    );


    setText(
        "#materialQuantity",
        formatNumber(
            summary.materialQuantity
        )
    );


    /*
       Common alternative IDs so the dashboard
       can use different naming conventions.
    */

    setText(
        "#totalSponsors",
        summary.sponsorCount
    );


    setText(
        "#totalDonations",
        summary.donationCount
    );


    setText(
        "#totalMaterials",
        formatNumber(
            summary.materialQuantity
        )
    );


    renderRecentSponsors();


    renderRecentDonations();

}


/* =========================================================
   16. INCOME TABLE
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

        table.innerHTML =
            emptyState(
                "No income records",
                "Income records will appear here."
            );

        return;

    }


    const records =
        App.data.income.slice(
            0,
            CONFIG.MAX_TABLE_ITEMS
        );


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

                    ${records.map(
                        item => `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    recordId(item)
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    recordDate(item)
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Name",
                                            "name",
                                            "Contributor",
                                            "contributor"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Category",
                                            "category"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    firstValue(
                                        item,
                                        [
                                            "Expected",
                                            "expected",
                                            "ExpectedAmount"
                                        ],
                                        0
                                    )
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    firstValue(
                                        item,
                                        [
                                            "Received",
                                            "received",
                                            "ReceivedAmount"
                                        ],
                                        0
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "PaymentMode",
                                            "paymentMode",
                                            "PaymentMethod"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Notes",
                                            "notes"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            ${
                                App.isAdmin
                                    ? actionButtons(
                                        "income",
                                        recordId(item)
                                    )
                                    : ""
                            }

                        </tr>

                    `
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;


    initializeRecordActions();

}


/* =========================================================
   17. EXPENSE TABLE
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

        table.innerHTML =
            emptyState(
                "No expense records",
                "Expense records will appear here."
            );

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

                    ${App.data.expenses.map(
                        item => `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    recordId(item)
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    recordDate(item)
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Description",
                                            "description"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Category",
                                            "category"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    recordAmount(item)
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "PaymentMode",
                                            "paymentMode",
                                            "PaymentMethod"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Notes",
                                            "notes"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            ${
                                App.isAdmin
                                    ? actionButtons(
                                        "expense",
                                        recordId(item)
                                    )
                                    : ""
                            }

                        </tr>

                    `
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;


    initializeRecordActions();

}


/* =========================================================
   18. RENTAL TABLE
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

        table.innerHTML =
            emptyState(
                "No rental records",
                "Rental records will appear here."
            );

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
                        <th>Pending</th>
                        <th>Notes</th>

                        ${
                            App.isAdmin
                                ? "<th>Actions</th>"
                                : ""
                        }

                    </tr>

                </thead>

                <tbody>

                    ${App.data.rentals.map(
                        item => {

                            const amount =
                                numberValue(
                                    firstValue(
                                        item,
                                        [
                                            "Amount",
                                            "amount",
                                            "ExpectedRent"
                                        ],
                                        0
                                    )
                                );


                            const paid =
                                numberValue(
                                    firstValue(
                                        item,
                                        [
                                            "Paid",
                                            "paid",
                                            "ActualPaid"
                                        ],
                                        0
                                    )
                                );


                            const pending =
                                Math.max(
                                    amount - paid,
                                    0
                                );


                            return `

                                <tr>

                                    <td>
                                        ${escapeHtml(
                                            recordId(item)
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            recordDate(item)
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            firstValue(
                                                item,
                                                [
                                                    "Description",
                                                    "description"
                                                ],
                                                "-"
                                            )
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            firstValue(
                                                item,
                                                [
                                                    "Category",
                                                    "category"
                                                ],
                                                "-"
                                            )
                                        )}
                                    </td>

                                    <td>
                                        ${formatCurrency(
                                            amount
                                        )}
                                    </td>

                                    <td>
                                        ${formatCurrency(
                                            paid
                                        )}
                                    </td>

                                    <td>
                                        ${formatCurrency(
                                            pending
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            firstValue(
                                                item,
                                                [
                                                    "Notes",
                                                    "notes"
                                                ],
                                                "-"
                                            )
                                        )}
                                    </td>

                                    ${
                                        App.isAdmin
                                            ? actionButtons(
                                                "rental",
                                                recordId(item)
                                            )
                                            : ""
                                    }

                                </tr>

                            `;

                        }
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;


    initializeRecordActions();

}


/* =========================================================
   19. TRANSPORT TABLE
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

        table.innerHTML =
            emptyState(
                "No transport records",
                "Transport records will appear here."
            );

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
                        <th>Pending</th>
                        <th>Notes</th>

                        ${
                            App.isAdmin
                                ? "<th>Actions</th>"
                                : ""
                        }

                    </tr>

                </thead>

                <tbody>

                    ${App.data.transport.map(
                        item => {

                            const amount =
                                numberValue(
                                    firstValue(
                                        item,
                                        [
                                            "Amount",
                                            "amount",
                                            "Total",
                                            "total"
                                        ],
                                        0
                                    )
                                );


                            const paid =
                                numberValue(
                                    firstValue(
                                        item,
                                        [
                                            "Paid",
                                            "paid",
                                            "ActualPaid"
                                        ],
                                        0
                                    )
                                );


                            const pending =
                                Math.max(
                                    amount - paid,
                                    0
                                );


                            return `

                                <tr>

                                    <td>
                                        ${escapeHtml(
                                            recordId(item)
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            recordDate(item)
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            firstValue(
                                                item,
                                                [
                                                    "Description",
                                                    "description"
                                                ],
                                                "-"
                                            )
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            firstValue(
                                                item,
                                                [
                                                    "Category",
                                                    "category"
                                                ],
                                                "-"
                                            )
                                        )}
                                    </td>

                                    <td>
                                        ${formatCurrency(
                                            amount
                                        )}
                                    </td>

                                    <td>
                                        ${formatCurrency(
                                            paid
                                        )}
                                    </td>

                                    <td>
                                        ${formatCurrency(
                                            pending
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            firstValue(
                                                item,
                                                [
                                                    "Notes",
                                                    "notes"
                                                ],
                                                "-"
                                            )
                                        )}
                                    </td>

                                    ${
                                        App.isAdmin
                                            ? actionButtons(
                                                "transport",
                                                recordId(item)
                                            )
                                            : ""
                                    }

                                </tr>

                            `;

                        }
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;


    initializeRecordActions();

}


/* =========================================================
   20. SPONSOR TABLE
   ========================================================= */

function renderSponsorTable() {

    const table =
        $("#sponsorTable");

    if (!table) {
        return;
    }


    if (
        App.data.sponsors.length === 0
    ) {

        table.innerHTML =
            emptyState(
                "No sponsors yet",
                "Sponsor records will appear here."
            );

        return;

    }


    table.innerHTML = `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>ID</th>
                        <th>Date</th>
                        <th>Sponsor</th>
                        <th>Category</th>
                        <th>Expected</th>
                        <th>Received</th>
                        <th>Pending</th>
                        <th>Contact</th>
                        <th>Notes</th>

                        ${
                            App.isAdmin
                                ? "<th>Actions</th>"
                                : ""
                        }

                    </tr>

                </thead>

                <tbody>

                    ${App.data.sponsors.map(
                        item => {

                            const expected =
                                numberValue(
                                    firstValue(
                                        item,
                                        [
                                            "Expected",
                                            "expected",
                                            "ExpectedAmount",
                                            "expectedAmount",
                                            "Amount",
                                            "amount"
                                        ],
                                        0
                                    )
                                );


                            const received =
                                numberValue(
                                    firstValue(
                                        item,
                                        [
                                            "Received",
                                            "received",
                                            "ReceivedAmount",
                                            "receivedAmount",
                                            "Paid",
                                            "paid"
                                        ],
                                        0
                                    )
                                );


                            const pending =
                                Math.max(
                                    expected - received,
                                    0
                                );


                            return `

                                <tr>

                                    <td>
                                        ${escapeHtml(
                                            recordId(item)
                                        )}
                                    </td>

                                    <td>
                                        ${formatDate(
                                            recordDate(item)
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            firstValue(
                                                item,
                                                [
                                                    "Name",
                                                    "name",
                                                    "Sponsor",
                                                    "sponsor",
                                                    "SponsorName",
                                                    "sponsorName"
                                                ],
                                                "-"
                                            )
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            firstValue(
                                                item,
                                                [
                                                    "Category",
                                                    "category"
                                                ],
                                                "Sponsor"
                                            )
                                        )}
                                    </td>

                                    <td>
                                        ${formatCurrency(
                                            expected
                                        )}
                                    </td>

                                    <td>
                                        ${formatCurrency(
                                            received
                                        )}
                                    </td>

                                    <td>
                                        ${formatCurrency(
                                            pending
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            firstValue(
                                                item,
                                                [
                                                    "Phone",
                                                    "phone",
                                                    "Contact",
                                                    "contact"
                                                ],
                                                "-"
                                            )
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            firstValue(
                                                item,
                                                [
                                                    "Notes",
                                                    "notes"
                                                ],
                                                "-"
                                            )
                                        )}
                                    </td>

                                    ${
                                        App.isAdmin
                                            ? actionButtons(
                                                "sponsor",
                                                recordId(item)
                                            )
                                            : ""
                                    }

                                </tr>

                            `;

                        }
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;


    initializeRecordActions();

}


/* =========================================================
   21. DONATIONS & MATERIALS TABLE
   ========================================================= */

function renderDonationTable() {

    const table =
        $("#donationTable") ||
        $("#donationsTable") ||
        $("#materialDonationTable");


    if (!table) {
        return;
    }


    if (
        App.data.donations.length === 0
    ) {

        table.innerHTML =
            emptyState(
                "No donations yet",
                "Cash and material donations will appear here."
            );

        return;

    }


    table.innerHTML = `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>ID</th>
                        <th>Date</th>
                        <th>Donor</th>
                        <th>Type</th>
                        <th>Item / Description</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Amount</th>
                        <th>Notes</th>

                        ${
                            App.isAdmin
                                ? "<th>Actions</th>"
                                : ""
                        }

                    </tr>

                </thead>

                <tbody>

                    ${App.data.donations.map(
                        item => `

                        <tr>

                            <td>
                                ${escapeHtml(
                                    recordId(item)
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    recordDate(item)
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Donor",
                                            "donor",
                                            "Name",
                                            "name"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    donationType(item)
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Description",
                                            "description",
                                            "Item",
                                            "item",
                                            "Material",
                                            "material"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            <td>
                                ${
                                    isMaterialDonation(item)
                                        ? formatNumber(
                                            firstValue(
                                                item,
                                                [
                                                    "Quantity",
                                                    "quantity",
                                                    "Qty",
                                                    "qty"
                                                ],
                                                0
                                            )
                                        )
                                        : "—"
                                }
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Unit",
                                            "unit"
                                        ],
                                        "—"
                                    )
                                )}
                            </td>

                            <td>
                                ${
                                    numberValue(
                                        firstValue(
                                            item,
                                            [
                                                "Amount",
                                                "amount"
                                            ],
                                            0
                                        )
                                    ) > 0
                                        ? formatCurrency(
                                            firstValue(
                                                item,
                                                [
                                                    "Amount",
                                                    "amount"
                                                ],
                                                0
                                            )
                                        )
                                        : "—"
                                }
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Notes",
                                            "notes"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            ${
                                App.isAdmin
                                    ? actionButtons(
                                        "donation",
                                        recordId(item)
                                    )
                                    : ""
                            }

                        </tr>

                    `
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;


    initializeRecordActions();

}


/* =========================================================
   22. DONATION TYPE HELPERS
   ========================================================= */

function donationType(item) {

    const type =
        String(
            firstValue(
                item,
                [
                    "Type",
                    "type",
                    "DonationType",
                    "donationType"
                ],
                ""
            )
        ).trim();


    if (
        type.toLowerCase() === "material"
    ) {

        return "Material";

    }


    if (
        type.toLowerCase() === "cash"
    ) {

        return "Cash";

    }


    /*
       If quantity/unit exists, treat it as material.
    */

    if (
        numberValue(
            firstValue(
                item,
                [
                    "Quantity",
                    "quantity",
                    "Qty",
                    "qty"
                ],
                0
            )
        ) > 0
    ) {

        return "Material";

    }


    return type || "Donation";

}


function isMaterialDonation(item) {

    return (
        donationType(item)
            .toLowerCase() ===
        "material"
    );

}


/* =========================================================
   23. EMPTY STATE
   ========================================================= */

function emptyState(
    title,
    message
) {

    return `

        <div class="empty-state">

            <h4>
                ${escapeHtml(title)}
            </h4>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>

    `;

}


/* =========================================================
   24. ACTION BUTTONS
   ========================================================= */

function actionButtons(
    type,
    id
) {

    return `

        <td>

            <button
                type="button"
                class="admin-action-button edit-record-button"
                data-type="${escapeHtml(type)}"
                data-id="${escapeHtml(id)}"
            >
                Edit
            </button>

            <button
                type="button"
                class="admin-action-button delete-record-button"
                data-type="${escapeHtml(type)}"
                data-id="${escapeHtml(id)}"
            >
                Delete
            </button>

        </td>

    `;

}


/* =========================================================
   25. INCOME SUMMARY
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
                    firstValue(
                        item,
                        [
                            "Expected",
                            "expected",
                            "ExpectedAmount"
                        ],
                        0
                    )
                ),
            0
        );


    const received =
        App.data.income.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    firstValue(
                        item,
                        [
                            "Received",
                            "received",
                            "ReceivedAmount"
                        ],
                        0
                    )
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
   26. EXPENSE SUMMARY
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
                recordAmount(item),
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
   27. RENTAL SUMMARY
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
                    firstValue(
                        item,
                        [
                            "Amount",
                            "amount",
                            "ExpectedRent"
                        ],
                        0
                    )
                ),
            0
        );


    const paid =
        App.data.rentals.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    firstValue(
                        item,
                        [
                            "Paid",
                            "paid",
                            "ActualPaid"
                        ],
                        0
                    )
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
   28. TRANSPORT SUMMARY
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
                    firstValue(
                        item,
                        [
                            "Amount",
                            "amount",
                            "Total",
                            "total"
                        ],
                        0
                    )
                ),
            0
        );


    const paid =
        App.data.transport.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    firstValue(
                        item,
                        [
                            "Paid",
                            "paid",
                            "ActualPaid"
                        ],
                        0
                    )
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
   29. SPONSOR SUMMARY
   ========================================================= */

function renderSponsorSummary() {

    const element =
        $("#sponsorSummary");

    if (!element) {
        return;
    }


    const summary =
        calculateSummary();


    element.innerHTML = `

        <div class="summary-card">

            <span>
                Sponsors
            </span>

            <strong>
                ${summary.sponsorCount}
            </strong>

        </div>

        <div class="summary-card">

            <span>
                Expected
            </span>

            <strong>
                ${formatCurrency(
                    summary.sponsorExpected
                )}
            </strong>

        </div>

        <div class="summary-card">

            <span>
                Received
            </span>

            <strong>
                ${formatCurrency(
                    summary.sponsorReceived
                )}
            </strong>

        </div>

        <div class="summary-card">

            <span>
                Pending
            </span>

            <strong>
                ${formatCurrency(
                    summary.sponsorPending
                )}
            </strong>

        </div>

    `;

}


/* =========================================================
   30. DONATION SUMMARY
   ========================================================= */

function renderDonationSummary() {

    const element =
        $("#donationSummary");

    if (!element) {
        return;
    }


    const cash =
        App.data.donations.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    firstValue(
                        item,
                        [
                            "Amount",
                            "amount"
                        ],
                        0
                    )
                ),
            0
        );


    const materials =
        App.data.donations.filter(
            isMaterialDonation
        );


    const quantity =
        materials.reduce(
            (sum, item) =>
                sum +
                numberValue(
                    firstValue(
                        item,
                        [
                            "Quantity",
                            "quantity",
                            "Qty",
                            "qty"
                        ],
                        0
                    )
                ),
            0
        );


    element.innerHTML = `

        <div class="summary-card">

            <span>
                Donations
            </span>

            <strong>
                ${App.data.donations.length}
            </strong>

        </div>

        <div class="summary-card">

            <span>
                Cash Donations
            </span>

            <strong>
                ${formatCurrency(cash)}
            </strong>

        </div>

        <div class="summary-card">

            <span>
                Material Records
            </span>

            <strong>
                ${materials.length}
            </strong>

        </div>

        <div class="summary-card">

            <span>
                Material Quantity
            </span>

            <strong>
                ${formatNumber(quantity)}
            </strong>

        </div>

    `;

}


/* =========================================================
   31. RECENT TRANSACTIONS
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
                    firstValue(
                        item,
                        [
                            "Expected",
                            "expected",
                            "ExpectedAmount"
                        ],
                        0
                    )
                );


            const received =
                numberValue(
                    firstValue(
                        item,
                        [
                            "Received",
                            "received",
                            "ReceivedAmount"
                        ],
                        0
                    )
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
                    recordDate(item),

                description:
                    firstValue(
                        item,
                        [
                            "Name",
                            "name",
                            "Contributor",
                            "contributor"
                        ],
                        "Income"
                    ),

                category:
                    firstValue(
                        item,
                        [
                            "Category",
                            "category"
                        ],
                        "—"
                    ),

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
                    recordDate(item),

                description:
                    firstValue(
                        item,
                        [
                            "Description",
                            "description"
                        ],
                        "Expense"
                    ),

                category:
                    firstValue(
                        item,
                        [
                            "Category",
                            "category"
                        ],
                        "—"
                    ),

                amount:
                    recordAmount(item),

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
                    firstValue(
                        item,
                        [
                            "Amount",
                            "amount",
                            "ExpectedRent"
                        ],
                        0
                    )
                );


            const paid =
                numberValue(
                    firstValue(
                        item,
                        [
                            "Paid",
                            "paid",
                            "ActualPaid"
                        ],
                        0
                    )
                );


            transactions.push({

                type: "Rental",

                date:
                    recordDate(item),

                description:
                    firstValue(
                        item,
                        [
                            "Description",
                            "description"
                        ],
                        "Rental"
                    ),

                category:
                    firstValue(
                        item,
                        [
                            "Category",
                            "category"
                        ],
                        "—"
                    ),

                amount:
                    paid,

                status:
                    paid >= amount &&
                    amount > 0
                        ? "Paid"
                        : "Pending",

                statusClass:
                    paid >= amount &&
                    amount > 0
                        ? "paid"
                        : "pending"

            });

        });


    /* ---------------- TRANSPORT ---------------- */

    (App.data.transport || [])
        .forEach(item => {

            const amount =
                numberValue(
                    firstValue(
                        item,
                        [
                            "Amount",
                            "amount",
                            "Total",
                            "total"
                        ],
                        0
                    )
                );


            const paid =
                numberValue(
                    firstValue(
                        item,
                        [
                            "Paid",
                            "paid",
                            "ActualPaid"
                        ],
                        0
                    )
                );


            transactions.push({

                type: "Transport",

                date:
                    recordDate(item),

                description:
                    firstValue(
                        item,
                        [
                            "Description",
                            "description"
                        ],
                        "Transport"
                    ),

                category:
                    firstValue(
                        item,
                        [
                            "Category",
                            "category"
                        ],
                        "—"
                    ),

                amount:
                    paid,

                status:
                    paid >= amount &&
                    amount > 0
                        ? "Paid"
                        : "Pending",

                statusClass:
                    paid >= amount &&
                    amount > 0
                        ? "paid"
                        : "pending"

            });

        });


    /* ---------------- SPONSORS ---------------- */

    (App.data.sponsors || [])
        .forEach(item => {

            const received =
                numberValue(
                    firstValue(
                        item,
                        [
                            "Received",
                            "received",
                            "ReceivedAmount"
                        ],
                        0
                    )
                );


            const expected =
                numberValue(
                    firstValue(
                        item,
                        [
                            "Expected",
                            "expected",
                            "ExpectedAmount"
                        ],
                        0
                    )
                );


            transactions.push({

                type: "Sponsor",

                date:
                    recordDate(item),

                description:
                    firstValue(
                        item,
                        [
                            "Name",
                            "name",
                            "Sponsor",
                            "sponsor",
                            "SponsorName"
                        ],
                        "Sponsor"
                    ),

                category:
                    firstValue(
                        item,
                        [
                            "Category",
                            "category"
                        ],
                        "Sponsorship"
                    ),

                amount:
                    received,

                status:
                    expected > 0 &&
                    received >= expected
                        ? "Received"
                        : "Pending",

                statusClass:
                    expected > 0 &&
                    received >= expected
                        ? "received"
                        : "pending"

            });

        });


    /* ---------------- DONATIONS ---------------- */

    (App.data.donations || [])
        .forEach(item => {

            const material =
                isMaterialDonation(item);


            transactions.push({

                type:
                    material
                        ? "Material"
                        : "Donation",

                date:
                    recordDate(item),

                description:
                    firstValue(
                        item,
                        [
                            "Description",
                            "description",
                            "Item",
                            "item",
                            "Material",
                            "material"
                        ],
                        firstValue(
                            item,
                            [
                                "Donor",
                                "donor",
                                "Name",
                                "name"
                            ],
                            "Donation"
                        )
                    ),

                category:
                    material
                        ? "Material Donation"
                        : "Cash Donation",

                amount:
                    numberValue(
                        firstValue(
                            item,
                            [
                                "Amount",
                                "amount"
                            ],
                            0
                        )
                    ),

                status:
                    material
                        ? "Received"
                        : "Received",

                statusClass:
                    "received"

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
                        once records are added.
                    </p>

                </div>

            </div>

        `;

        return;

    }


    const recentTransactions =
        transactions.slice(
            0,
            CONFIG.MAX_RECENT_ITEMS
        );


    container.innerHTML = `

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

                    ${recentTransactions.map(
                        transaction => `

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

                                ${
                                    transaction.amount > 0
                                        ? formatCurrency(
                                            transaction.amount
                                        )
                                        : "—"
                                }

                            </td>

                            <td>

                                <span
                                    class="transaction-status ${escapeHtml(
                                        transaction.statusClass
                                    )}"
                                >

                                    ${escapeHtml(
                                        transaction.status
                                    )}

                                </span>

                            </td>

                        </tr>

                    `
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;

}


/* =========================================================
   32. RECENT SPONSORS
   ========================================================= */

function renderRecentSponsors() {

    const container =
        $("#recentSponsors");

    if (!container) {
        return;
    }


    const records =
        [...App.data.sponsors]
            .sort(
                (a, b) =>
                    new Date(
                        recordDate(b) || 0
                    ) -
                    new Date(
                        recordDate(a) || 0
                    )
            )
            .slice(
                0,
                5
            );


    if (records.length === 0) {

        container.innerHTML =
            emptyState(
                "No sponsors yet",
                "Sponsors will appear here."
            );

        return;

    }


    container.innerHTML = `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>Date</th>
                        <th>Sponsor</th>
                        <th>Expected</th>
                        <th>Received</th>
                        <th>Status</th>

                    </tr>

                </thead>

                <tbody>

                    ${records.map(
                        item => {

                            const expected =
                                numberValue(
                                    firstValue(
                                        item,
                                        [
                                            "Expected",
                                            "expected",
                                            "ExpectedAmount"
                                        ],
                                        0
                                    )
                                );


                            const received =
                                numberValue(
                                    firstValue(
                                        item,
                                        [
                                            "Received",
                                            "received",
                                            "ReceivedAmount"
                                        ],
                                        0
                                    )
                                );


                            const complete =
                                expected > 0 &&
                                received >= expected;


                            return `

                                <tr>

                                    <td>
                                        ${formatDate(
                                            recordDate(item)
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            firstValue(
                                                item,
                                                [
                                                    "Name",
                                                    "name",
                                                    "Sponsor",
                                                    "sponsor",
                                                    "SponsorName"
                                                ],
                                                "-"
                                            )
                                        )}
                                    </td>

                                    <td>
                                        ${formatCurrency(
                                            expected
                                        )}
                                    </td>

                                    <td>
                                        ${formatCurrency(
                                            received
                                        )}
                                    </td>

                                    <td>

                                        <span
                                            class="transaction-status ${
                                                complete
                                                    ? "received"
                                                    : "pending"
                                            }"
                                        >
                                            ${
                                                complete
                                                    ? "Received"
                                                    : "Pending"
                                            }
                                        </span>

                                    </td>

                                </tr>

                            `;

                        }
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;

}


/* =========================================================
   33. RECENT DONATIONS
   ========================================================= */

function renderRecentDonations() {

    const container =
        $("#recentDonations") ||
        $("#recentMaterialDonations");


    if (!container) {
        return;
    }


    const records =
        [...App.data.donations]
            .sort(
                (a, b) =>
                    new Date(
                        recordDate(b) || 0
                    ) -
                    new Date(
                        recordDate(a) || 0
                    )
            )
            .slice(
                0,
                5
            );


    if (records.length === 0) {

        container.innerHTML =
            emptyState(
                "No donations yet",
                "Donations and materials will appear here."
            );

        return;

    }


    container.innerHTML = `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>Date</th>
                        <th>Donor</th>
                        <th>Type</th>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Unit</th>

                    </tr>

                </thead>

                <tbody>

                    ${records.map(
                        item => `

                        <tr>

                            <td>
                                ${formatDate(
                                    recordDate(item)
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Donor",
                                            "donor",
                                            "Name",
                                            "name"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    donationType(item)
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Description",
                                            "description",
                                            "Item",
                                            "item",
                                            "Material",
                                            "material"
                                        ],
                                        "-"
                                    )
                                )}
                            </td>

                            <td>

                                ${
                                    isMaterialDonation(item)
                                        ? formatNumber(
                                            firstValue(
                                                item,
                                                [
                                                    "Quantity",
                                                    "quantity",
                                                    "Qty",
                                                    "qty"
                                                ],
                                                0
                                            )
                                        )
                                        : "—"
                                }

                            </td>

                            <td>
                                ${escapeHtml(
                                    firstValue(
                                        item,
                                        [
                                            "Unit",
                                            "unit"
                                        ],
                                        "—"
                                    )
                                )}
                            </td>

                        </tr>

                    `
                    ).join("")}

                </tbody>

            </table>

        </div>

    `;

}


/* =========================================================
   34. RENDER APPLICATION
   ========================================================= */

function renderApplication() {

    clearApplicationError();


    renderDashboard();


    renderIncomeSummary();
    renderIncomeTable();


    renderExpenseSummary();
    renderExpenseTable();


    renderRentalSummary();
    renderRentalTable();


    renderTransportSummary();
    renderTransportTable();


    renderSponsorSummary();
    renderSponsorTable();


    renderDonationSummary();
    renderDonationTable();


    renderRecentTransactions();


    updateAdminInterface();

}


/* =========================================================
   35. NAVIGATION
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
   36. NAVIGATION EVENTS
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
   37. LOGIN MODAL
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
   38. ADMIN LOGIN
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
   39. ADMIN LOGOUT
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
   40. ADMIN MODE
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
   41. ADMIN UI
   ========================================================= */

function updateAdminInterface() {

    $$(".admin-only")
        .forEach(element => {

            element.style.display =
                App.isAdmin
                    ? ""
                    : "none";

        });


    /*
       Add buttons should remain hidden
       from public users.
    */

    [
        "#addIncomeButton",
        "#addExpenseButton",
        "#addRentalButton",
        "#addTransportButton",
        "#addSponsorButton",
        "#addDonationButton",
        "#addMaterialDonationButton"
    ]
        .forEach(selector => {

            const element =
                $(selector);

            if (element) {

                element.style.display =
                    App.isAdmin
                        ? ""
                        : "none";

            }

        });


    /*
       Action columns/buttons are rendered
       only when App.isAdmin is true.
    */

}


/* =========================================================
   42. LOGIN MESSAGE
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
   43. LOGIN INITIALIZATION
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

}


/* =========================================================
   44. RESTORE ADMIN SESSION
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
   45. QUICK ACCESS
   ========================================================= */

function initializeQuickAccess() {

    /*
       Navigation is handled centrally by
       initializeNavigation().
    */

}


/* =========================================================
   46. ADMIN FORM MODAL
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
        "modal finance-form-modal admin-form-modal";


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
   47. FORM FIELD HELPERS
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
                ${
                    type === "number"
                        ? 'min="0" step="any"'
                        : ""
                }
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
                                String(selected) ===
                                String(option)
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
   48. FORM HEADER
   ========================================================= */

function formHeader(
    title,
    description
) {

    return `

        <div class="admin-form-header">

            <span>
                DUSSEHRA FINANCE
            </span>

            <h2>
                ${escapeHtml(title)}
            </h2>

            <p>
                ${escapeHtml(description)}
            </p>

        </div>

    `;

}


/* =========================================================
   49. FORM FOOTER
   ========================================================= */

function formFooter(
    saveText
) {

    return `

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
                ${escapeHtml(saveText)}
            </button>

        </div>

    `;

}


/* =========================================================
   50. OPEN ADD FORM
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

    App.editingId =
        null;


    const modal =
        createAdminFormModal();


    const content =
        $("#adminFormContent");


    if (!content) {
        return;
    }


    const today =
        todayForInput();


    let form =
        "";


    /* =====================================================
       INCOME
       ===================================================== */

    if (type === "income") {

        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                ${formHeader(
                    "Add Income",
                    "Enter the income received or expected."
                )}

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
                        "0",
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

                ${formFooter(
                    "Save Income"
                )}

            </form>

        `;

    }


    /* =====================================================
       EXPENSE
       ===================================================== */

    else if (type === "expense") {

        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                ${formHeader(
                    "Add Expense",
                    "Record festival expenses."
                )}

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

                ${formFooter(
                    "Save Expense"
                )}

            </form>

        `;

    }


    /* =====================================================
       RENTAL
       ===================================================== */

    else if (type === "rental") {

        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                ${formHeader(
                    "Add Rental",
                    "Record rented items and payments."
                )}

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
                        "0",
                        "0.00"
                    )}

                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        "",
                        "Optional notes"
                    )}

                </div>

                ${formFooter(
                    "Save Rental"
                )}

            </form>

        `;

    }


    /* =====================================================
       TRANSPORT
       ===================================================== */

    else if (type === "transport") {

        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                ${formHeader(
                    "Add Transport",
                    "Record festival transportation costs."
                )}

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
                        "0",
                        "0.00"
                    )}

                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        "",
                        "Optional notes"
                    )}

                </div>

                ${formFooter(
                    "Save Transport"
                )}

            </form>

        `;

    }


    /* =====================================================
       SPONSOR
       ===================================================== */

    else if (type === "sponsor") {

        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                ${formHeader(
                    "Add Sponsor",
                    "Record a festival sponsor and sponsorship commitment."
                )}

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
                        "Sponsor Name",
                        "text",
                        true,
                        "",
                        "Individual / business / organization"
                    )}

                    ${formInput(
                        "recordCategory",
                        "Category",
                        "text",
                        true,
                        "Sponsorship",
                        "Main Sponsor / Idol / Food / Lighting / Other"
                    )}

                    ${formInput(
                        "recordExpected",
                        "Expected Sponsorship",
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
                        "0",
                        "0.00"
                    )}

                    ${formInput(
                        "recordPhone",
                        "Contact",
                        "tel",
                        false,
                        "",
                        "Phone number"
                    )}

                    ${formInput(
                        "recordReference",
                        "Reference",
                        "text",
                        false,
                        "",
                        "Payment/reference number"
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
                        false
                    )}

                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        "",
                        "Optional notes"
                    )}

                </div>

                ${formFooter(
                    "Save Sponsor"
                )}

            </form>

        `;

    }


    /* =====================================================
       DONATION / MATERIAL
       ===================================================== */

    else if (type === "donation") {

        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                ${formHeader(
                    "Add Donation",
                    "Record cash or material donations. Material donations can be quantity-only."
                )}

                <div class="admin-form-grid">

                    ${formInput(
                        "recordDate",
                        "Date",
                        "date",
                        true,
                        today
                    )}

                    ${formInput(
                        "recordDonor",
                        "Donor Name",
                        "text",
                        true,
                        "",
                        "Donor / family / organization"
                    )}

                    ${formSelect(
                        "recordDonationType",
                        "Donation Type",
                        [
                            "Cash",
                            "Material"
                        ],
                        true
                    )}

                    ${formInput(
                        "recordDescription",
                        "Item / Description",
                        "text",
                        true,
                        "",
                        "Example: Rice / Oil / Plates / Cash donation"
                    )}

                    ${formInput(
                        "recordQuantity",
                        "Quantity",
                        "number",
                        false,
                        "",
                        "0"
                    )}

                    ${formInput(
                        "recordUnit",
                        "Unit",
                        "text",
                        false,
                        "",
                        "kg / litres / bags / boxes / pieces"
                    )}

                    ${formInput(
                        "recordAmount",
                        "Cash Value",
                        "number",
                        false,
                        "0",
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
                        false
                    )}

                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        "",
                        "Optional notes"
                    )}

                </div>

                ${formFooter(
                    "Save Donation"
                )}

            </form>

        `;

    }


    else {

        alert(
            "Unknown form type."
        );

        return;

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


    initializeDonationTypeFields();


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
   51. DONATION TYPE UI
   ========================================================= */

function initializeDonationTypeFields() {

    const type =
        $("#recordDonationType");


    if (!type) {
        return;
    }


    const quantity =
        $("#recordQuantity");


    const unit =
        $("#recordUnit");


    const amount =
        $("#recordAmount");


    function updateFields() {

        const isMaterial =
            type.value === "Material";


        if (quantity) {

            quantity.required =
                isMaterial;

        }


        if (unit) {

            unit.required =
                isMaterial;

        }


        if (amount) {

            /*
               Cash donation requires amount.
               Material donation does not.
            */

            amount.required =
                !isMaterial;


            if (isMaterial) {

                amount.placeholder =
                    "Optional estimated value";

            }
            else {

                amount.placeholder =
                    "0.00";

            }

        }

    }


    type.addEventListener(
        "change",
        updateFields
    );


    updateFields();

}


/* =========================================================
   52. CLOSE ADMIN FORM
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

    App.editingId =
        null;

}


/* =========================================================
   53. INITIALIZE ADD BUTTONS
   ========================================================= */

function initializeAddButtons() {

    const buttons = {

        addIncomeButton:
            "income",

        addExpenseButton:
            "expense",

        addRentalButton:
            "rental",

        addTransportButton:
            "transport",

        addSponsorButton:
            "sponsor",

        addDonationButton:
            "donation",

        addMaterialDonationButton:
            "donation"

    };


    Object.entries(buttons)
        .forEach(
            ([id, type]) => {

                const button =
                    document.getElementById(
                        id
                    );


                if (!button) {
                    return;
                }


                /*
                   Prevent duplicate listeners
                   if initialization is called again.
                */

                if (
                    button.dataset.dfBound ===
                    "true"
                ) {
                    return;
                }


                button.dataset.dfBound =
                    "true";


                button.addEventListener(
                    "click",
                    () => {

                        openAddForm(
                            type
                        );

                    }
                );

            }
        );

}


/* =========================================================
   54. INITIALIZE ADMIN RECORD FORM
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
   55. FORM MESSAGE
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
   56. SUBMIT ADMIN RECORD
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


            if (
                expected < 0 ||
                received < 0
            ) {

                throw new Error(
                    "Amounts cannot be negative."
                );

            }


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

                expected,

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


            if (amount < 0) {

                throw new Error(
                    "Amount cannot be negative."
                );

            }


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


            if (
                amount < 0 ||
                paid < 0
            ) {

                throw new Error(
                    "Amounts cannot be negative."
                );

            }


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

                amount,

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


            if (
                amount < 0 ||
                paid < 0
            ) {

                throw new Error(
                    "Amounts cannot be negative."
                );

            }


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

                amount,

                paid,

                notes:
                    $("#recordNotes").value.trim()

            };

        }


        /* =================================================
           SPONSOR
           ================================================= */

        else if (type === "sponsor") {

            const expected =
                numberValue(
                    $("#recordExpected")?.value
                );


            const received =
                numberValue(
                    $("#recordReceived")?.value
                );


            if (
                expected < 0 ||
                received < 0
            ) {

                throw new Error(
                    "Sponsorship amounts cannot be negative."
                );

            }


            if (received > expected) {

                throw new Error(
                    "Received sponsorship cannot be greater than expected sponsorship."
                );

            }


            payload = {

                ...payload,

                action:
                    "addSponsor",

                date:
                    $("#recordDate").value,

                name:
                    $("#recordName").value.trim(),

                category:
                    $("#recordCategory").value.trim(),

                expected,

                received,

                phone:
                    $("#recordPhone")?.value.trim() ||
                    "",

                reference:
                    $("#recordReference")?.value.trim() ||
                    "",

                paymentMode:
                    $("#recordPaymentMode")?.value ||
                    "",

                notes:
                    $("#recordNotes").value.trim()

            };

        }


        /* =================================================
           DONATION / MATERIAL
           ================================================= */

        else if (type === "donation") {

            const donationType =
                $("#recordDonationType")?.value;


            const quantity =
                numberValue(
                    $("#recordQuantity")?.value
                );


            const amount =
                numberValue(
                    $("#recordAmount")?.value
                );


            if (!donationType) {

                throw new Error(
                    "Please select the donation type."
                );

            }


            if (donationType === "Material") {

                if (
                    quantity <= 0
                ) {

                    throw new Error(
                        "Material donation quantity must be greater than zero."
                    );

                }


                if (
                    !$("#recordUnit")?.value.trim()
                ) {

                    throw new Error(
                        "Please enter the material unit."
                    );

                }

            }
            else {

                if (
                    amount <= 0
                ) {

                    throw new Error(
                        "Cash donation amount must be greater than zero."
                    );

                }

            }


            payload = {

                ...payload,

                action:
                    "addDonation",

                date:
                    $("#recordDate").value,

                donor:
                    $("#recordDonor").value.trim(),

                type:
                    donationType,

                description:
                    $("#recordDescription").value.trim(),

                quantity:
                    quantity,

                unit:
                    $("#recordUnit").value.trim(),

                amount:
                    amount,

                paymentMode:
                    $("#recordPaymentMode")?.value ||
                    "",

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
           COMMON VALIDATION
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
            type !== "sponsor" &&
            type !== "donation" &&
            !payload.description
        ) {

            throw new Error(
                "Please enter a description."
            );

        }


        if (
            type === "sponsor" &&
            !payload.name
        ) {

            throw new Error(
                "Please enter the sponsor name."
            );

        }


        if (
            type === "sponsor" &&
            !payload.category
        ) {

            throw new Error(
                "Please enter the sponsor category."
            );

        }


        if (
            type === "donation" &&
            !payload.donor
        ) {

            throw new Error(
                "Please enter the donor name."
            );

        }


        if (
            type === "donation" &&
            !payload.description
        ) {

            throw new Error(
                "Please enter the donation item or description."
            );

        }


        if (
            type !== "donation" &&
            type !== "sponsor" &&
            !payload.category
        ) {

            throw new Error(
                "Please enter a category."
            );

        }


        showAdminFormMessage(
            "Saving record..."
        );


        await apiPost(
            payload
        );


        showAdminFormMessage(
            "Record saved successfully."
        );


        await loadAllData();


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
   57. SAVE BUTTON TEXT
   ========================================================= */

function getSaveButtonText(type) {

    const names = {

        income:
            "Save Income",

        expense:
            "Save Expense",

        rental:
            "Save Rental",

        transport:
            "Save Transport",

        sponsor:
            "Save Sponsor",

        donation:
            "Save Donation"

    };


    return names[type] ||
        "Save";

}


/* =========================================================
   58. FIND COLLECTION
   ========================================================= */

function getCollection(type) {

    const collections = {

        income:
            App.data.income,

        expense:
            App.data.expenses,

        rental:
            App.data.rentals,

        transport:
            App.data.transport,

        sponsor:
            App.data.sponsors,

        donation:
            App.data.donations

    };


    return collections[type] ||
        null;

}


/* =========================================================
   59. EDIT RECORD
   ========================================================= */

function openEditForm(
    type,
    id
) {

    if (!App.isAdmin) {
        return;
    }


    const collection =
        getCollection(type);


    if (!collection) {
        return;
    }


    const item =
        collection.find(
            record =>
                recordId(record) ===
                String(id)
        );


    if (!item) {

        alert(
            "Record not found."
        );

        return;

    }


    App.formType =
        type;

    App.editingId =
        id;


    const modal =
        createAdminFormModal();


    const content =
        $("#adminFormContent");


    if (!content) {
        return;
    }


    const date =
        normalizeDateForInput(
            recordDate(item)
        );


    let form =
        "";


    /* =====================================================
       INCOME
       ===================================================== */

    if (type === "income") {

        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                ${formHeader(
                    "Edit Income",
                    "Update this income record."
                )}

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
                        firstValue(
                            item,
                            [
                                "Name",
                                "name",
                                "Contributor"
                            ],
                            ""
                        )
                    )}

                    ${formInput(
                        "recordCategory",
                        "Category",
                        "text",
                        true,
                        firstValue(
                            item,
                            [
                                "Category",
                                "category"
                            ],
                            ""
                        )
                    )}

                    ${formInput(
                        "recordExpected",
                        "Expected Amount",
                        "number",
                        true,
                        firstValue(
                            item,
                            [
                                "Expected",
                                "expected",
                                "ExpectedAmount"
                            ],
                            0
                        )
                    )}

                    ${formInput(
                        "recordReceived",
                        "Received Amount",
                        "number",
                        true,
                        firstValue(
                            item,
                            [
                                "Received",
                                "received",
                                "ReceivedAmount"
                            ],
                            0
                        )
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
                        firstValue(
                            item,
                            [
                                "PaymentMode",
                                "paymentMode",
                                "PaymentMethod"
                            ],
                            ""
                        )
                    )}

                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        firstValue(
                            item,
                            [
                                "Notes",
                                "notes"
                            ],
                            ""
                        )
                    )}

                </div>

                ${formFooter(
                    "Update Income"
                )}

            </form>

        `;

    }


    /* =====================================================
       EXPENSE
       ===================================================== */

    else if (type === "expense") {

        form = buildSimpleEditForm(
            "Edit Expense",
            "Update this expense record.",
            item,
            "expense",
            "Update Expense"
        );

    }


    /* =====================================================
       RENTAL
       ===================================================== */

    else if (type === "rental") {

        form = buildSimpleEditForm(
            "Edit Rental",
            "Update this rental record.",
            item,
            "rental",
            "Update Rental"
        );

    }


    /* =====================================================
       TRANSPORT
       ===================================================== */

    else if (type === "transport") {

        form = buildSimpleEditForm(
            "Edit Transport",
            "Update this transport record.",
            item,
            "transport",
            "Update Transport"
        );

    }


    /* =====================================================
       SPONSOR
       ===================================================== */

    else if (type === "sponsor") {

        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                ${formHeader(
                    "Edit Sponsor",
                    "Update this sponsor record."
                )}

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
                        "Sponsor Name",
                        "text",
                        true,
                        firstValue(
                            item,
                            [
                                "Name",
                                "name",
                                "Sponsor",
                                "sponsor",
                                "SponsorName"
                            ],
                            ""
                        )
                    )}

                    ${formInput(
                        "recordCategory",
                        "Category",
                        "text",
                        true,
                        firstValue(
                            item,
                            [
                                "Category",
                                "category"
                            ],
                            "Sponsorship"
                        )
                    )}

                    ${formInput(
                        "recordExpected",
                        "Expected Sponsorship",
                        "number",
                        true,
                        firstValue(
                            item,
                            [
                                "Expected",
                                "expected",
                                "ExpectedAmount"
                            ],
                            0
                        )
                    )}

                    ${formInput(
                        "recordReceived",
                        "Received Amount",
                        "number",
                        true,
                        firstValue(
                            item,
                            [
                                "Received",
                                "received",
                                "ReceivedAmount"
                            ],
                            0
                        )
                    )}

                    ${formInput(
                        "recordPhone",
                        "Contact",
                        "tel",
                        false,
                        firstValue(
                            item,
                            [
                                "Phone",
                                "phone",
                                "Contact",
                                "contact"
                            ],
                            ""
                        )
                    )}

                    ${formInput(
                        "recordReference",
                        "Reference",
                        "text",
                        false,
                        firstValue(
                            item,
                            [
                                "Reference",
                                "reference"
                            ],
                            ""
                        )
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
                        false,
                        firstValue(
                            item,
                            [
                                "PaymentMode",
                                "paymentMode",
                                "PaymentMethod"
                            ],
                            ""
                        )
                    )}

                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        firstValue(
                            item,
                            [
                                "Notes",
                                "notes"
                            ],
                            ""
                        )
                    )}

                </div>

                ${formFooter(
                    "Update Sponsor"
                )}

            </form>

        `;

    }


    /* =====================================================
       DONATION
       ===================================================== */

    else if (type === "donation") {

        const material =
            isMaterialDonation(item);


        form = `

            <form
                id="adminRecordForm"
                class="admin-record-form"
            >

                ${formHeader(
                    "Edit Donation",
                    "Update this cash or material donation."
                )}

                <div class="admin-form-grid">

                    ${formInput(
                        "recordDate",
                        "Date",
                        "date",
                        true,
                        date
                    )}

                    ${formInput(
                        "recordDonor",
                        "Donor Name",
                        "text",
                        true,
                        firstValue(
                            item,
                            [
                                "Donor",
                                "donor",
                                "Name",
                                "name"
                            ],
                            ""
                        )
                    )}

                    ${formSelect(
                        "recordDonationType",
                        "Donation Type",
                        [
                            "Cash",
                            "Material"
                        ],
                        true,
                        material
                            ? "Material"
                            : "Cash"
                    )}

                    ${formInput(
                        "recordDescription",
                        "Item / Description",
                        "text",
                        true,
                        firstValue(
                            item,
                            [
                                "Description",
                                "description",
                                "Item",
                                "item",
                                "Material",
                                "material"
                            ],
                            ""
                        )
                    )}

                    ${formInput(
                        "recordQuantity",
                        "Quantity",
                        "number",
                        material,
                        firstValue(
                            item,
                            [
                                "Quantity",
                                "quantity",
                                "Qty",
                                "qty"
                            ],
                            0
                        )
                    )}

                    ${formInput(
                        "recordUnit",
                        "Unit",
                        "text",
                        material,
                        firstValue(
                            item,
                            [
                                "Unit",
                                "unit"
                            ],
                            ""
                        )
                    )}

                    ${formInput(
                        "recordAmount",
                        "Cash Value",
                        "number",
                        !material,
                        firstValue(
                            item,
                            [
                                "Amount",
                                "amount"
                            ],
                            0
                        )
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
                        false,
                        firstValue(
                            item,
                            [
                                "PaymentMode",
                                "paymentMode",
                                "PaymentMethod"
                            ],
                            ""
                        )
                    )}

                    ${formTextarea(
                        "recordNotes",
                        "Notes",
                        firstValue(
                            item,
                            [
                                "Notes",
                                "notes"
                            ],
                            ""
                        )
                    )}

                </div>

                ${formFooter(
                    "Update Donation"
                )}

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


    initializeDonationTypeFields();

}


/* =========================================================
   60. SIMPLE EDIT FORM
   ========================================================= */

function buildSimpleEditForm(
    title,
    description,
    item,
    type,
    saveText
) {

    return `

        <form
            id="adminRecordForm"
            class="admin-record-form"
        >

            ${formHeader(
                title,
                description
            )}

            <div class="admin-form-grid">

                ${formInput(
                    "recordDate",
                    "Date",
                    "date",
                    true,
                    normalizeDateForInput(
                        recordDate(item)
                    )
                )}

                ${formInput(
                    "recordDescription",
                    "Description",
                    "text",
                    true,
                    firstValue(
                        item,
                        [
                            "Description",
                            "description"
                        ],
                        ""
                    )
                )}

                ${formInput(
                    "recordCategory",
                    "Category",
                    "text",
                    true,
                    firstValue(
                        item,
                        [
                            "Category",
                            "category"
                        ],
                        ""
                    )
                )}

                ${formInput(
                    "recordAmount",
                    "Total Amount",
                    "number",
                    true,
                    firstValue(
                        item,
                        [
                            "Amount",
                            "amount",
                            "Total",
                            "total",
                            "ExpectedRent"
                        ],
                        0
                    )
                )}

                ${
                    type === "expense"
                        ? formSelect(
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
                            firstValue(
                                item,
                                [
                                    "PaymentMode",
                                    "paymentMode",
                                    "PaymentMethod"
                                ],
                                ""
                            )
                        )
                        : formInput(
                            "recordPaid",
                            "Paid Amount",
                            "number",
                            true,
                            firstValue(
                                item,
                                [
                                    "Paid",
                                    "paid",
                                    "ActualPaid"
                                ],
                                0
                            )
                        )
                }

                ${formTextarea(
                    "recordNotes",
                    "Notes",
                    firstValue(
                        item,
                        [
                            "Notes",
                            "notes"
                        ],
                        ""
                    )
                )}

            </div>

            ${formFooter(
                saveText
            )}

        </form>

    `;

}


/* =========================================================
   61. EDIT FORM SUBMIT
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

                const payload =
                    buildUpdatePayload(
                        type,
                        id
                    );


                validateUpdatePayload(
                    type,
                    payload
                );


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
   62. BUILD UPDATE PAYLOAD
   ========================================================= */

function buildUpdatePayload(
    type,
    id
) {

    let payload = {

        action:
            getUpdateAction(type),

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


    else if (
        type === "expense"
    ) {

        payload.description =
            $("#recordDescription").value.trim();

        payload.category =
            $("#recordCategory").value.trim();

        payload.amount =
            numberValue(
                $("#recordAmount").value
            );

        payload.paymentMode =
            $("#recordPaymentMode").value;

    }


    else if (
        type === "rental" ||
        type === "transport"
    ) {

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


    else if (
        type === "sponsor"
    ) {

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

        payload.phone =
            $("#recordPhone")?.value.trim() ||
            "";

        payload.reference =
            $("#recordReference")?.value.trim() ||
            "";

        payload.paymentMode =
            $("#recordPaymentMode")?.value ||
            "";

    }


    else if (
        type === "donation"
    ) {

        payload.donor =
            $("#recordDonor").value.trim();

        payload.type =
            $("#recordDonationType").value;

        payload.description =
            $("#recordDescription").value.trim();

        payload.quantity =
            numberValue(
                $("#recordQuantity").value
            );

        payload.unit =
            $("#recordUnit").value.trim();

        payload.amount =
            numberValue(
                $("#recordAmount").value
            );

        payload.paymentMode =
            $("#recordPaymentMode")?.value ||
            "";

    }


    return payload;

}


/* =========================================================
   63. VALIDATE UPDATE
   ========================================================= */

function validateUpdatePayload(
    type,
    payload
) {

    if (!payload.date) {

        throw new Error(
            "Please select a date."
        );

    }


    if (
        type === "income"
    ) {

        if (!payload.name) {

            throw new Error(
                "Please enter the income name."
            );

        }


        if (!payload.category) {

            throw new Error(
                "Please enter the income category."
            );

        }


        if (
            payload.expected < 0 ||
            payload.received < 0
        ) {

            throw new Error(
                "Income amounts cannot be negative."
            );

        }


        if (
            payload.received >
            payload.expected
        ) {

            throw new Error(
                "Received amount cannot be greater than expected amount."
            );

        }

    }


    if (
        type === "expense"
    ) {

        if (!payload.description) {

            throw new Error(
                "Please enter the expense description."
            );

        }


        if (!payload.category) {

            throw new Error(
                "Please enter the expense category."
            );

        }


        if (
            payload.amount < 0
        ) {

            throw new Error(
                "Expense amount cannot be negative."
            );

        }

    }


    if (
        type === "rental" ||
        type === "transport"
    ) {

        if (!payload.description) {

            throw new Error(
                "Please enter the description."
            );

        }


        if (!payload.category) {

            throw new Error(
                "Please enter the category."
            );

        }


        if (
            payload.amount < 0 ||
            payload.paid < 0
        ) {

            throw new Error(
                "Amounts cannot be negative."
            );

        }


        if (
            payload.paid >
            payload.amount
        ) {

            throw new Error(
                "Paid amount cannot be greater than total amount."
            );

        }

    }


    if (
        type === "sponsor"
    ) {

        if (!payload.name) {

            throw new Error(
                "Please enter the sponsor name."
            );

        }


        if (
            payload.expected < 0 ||
            payload.received < 0
        ) {

            throw new Error(
                "Sponsorship amounts cannot be negative."
            );

        }


        if (
            payload.received >
            payload.expected
        ) {

            throw new Error(
                "Received sponsorship cannot be greater than expected sponsorship."
            );

        }

    }


    if (
        type === "donation"
    ) {

        if (!payload.donor) {

            throw new Error(
                "Please enter the donor name."
            );

        }


        if (!payload.description) {

            throw new Error(
                "Please enter the donation description."
            );

        }


        if (
            payload.type ===
            "Material"
        ) {

            if (
                payload.quantity <= 0
            ) {

                throw new Error(
                    "Material quantity must be greater than zero."
                );

            }


            if (!payload.unit) {

                throw new Error(
                    "Please enter the material unit."
                );

            }

        }
        else {

            if (
                payload.amount <= 0
            ) {

                throw new Error(
                    "Cash donation amount must be greater than zero."
                );

            }

        }

    }

}


/* =========================================================
   64. UPDATE ACTION
   ========================================================= */

function getUpdateAction(type) {

    const actions = {

        income:
            "updateIncome",

        expense:
            "updateExpense",

        rental:
            "updateRental",

        transport:
            "updateTransport",

        sponsor:
            "updateSponsor",

        donation:
            "updateDonation"

    };


    return actions[type] ||
        "";

}


/* =========================================================
   65. UPDATE BUTTON TEXT
   ========================================================= */

function getUpdateButtonText(type) {

    const names = {

        income:
            "Update Income",

        expense:
            "Update Expense",

        rental:
            "Update Rental",

        transport:
            "Update Transport",

        sponsor:
            "Update Sponsor",

        donation:
            "Update Donation"

    };


    return names[type] ||
        "Update";

}


/* =========================================================
   66. DELETE RECORD
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


    const labels = {

        income:
            "income",

        expense:
            "expense",

        rental:
            "rental",

        transport:
            "transport",

        sponsor:
            "sponsor",

        donation:
            "donation"

    };


    const label =
        labels[type] ||
        "record";


    const confirmed =
        window.confirm(
            `Are you sure you want to delete this ${label} record?\n\nID: ${id}`
        );


    if (!confirmed) {
        return;
    }


    try {

        setConnectionStatus(
            "Deleting...",
            "loading"
        );


        const action =
            getDeleteAction(
                type
            );


        if (!action) {

            throw new Error(
                "Delete action is not configured."
            );

        }


        await apiPost({

            action,

            token:
                App.adminToken,

            id

        });


        await loadAllData();


        alert(
            `${capitalize(label)} deleted successfully.`
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


        setConnectionStatus(
            App.isAdmin
                ? "Admin Mode"
                : "Connected",
            "online"
        );

    }

}


/* =========================================================
   67. DELETE ACTION
   ========================================================= */

function getDeleteAction(type) {

    const actions = {

        income:
            "deleteIncome",

        expense:
            "deleteExpense",

        rental:
            "deleteRental",

        transport:
            "deleteTransport",

        sponsor:
            "deleteSponsor",

        donation:
            "deleteDonation"

    };


    return actions[type] ||
        "";

}


/* =========================================================
   68. RECORD ACTION BUTTONS
   ========================================================= */

function initializeRecordActions() {

    $$(".edit-record-button")
        .forEach(button => {

            if (
                button.dataset.dfBound ===
                "true"
            ) {
                return;
            }


            button.dataset.dfBound =
                "true";


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

            if (
                button.dataset.dfBound ===
                "true"
            ) {
                return;
            }


            button.dataset.dfBound =
                "true";


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
   69. CAPITALIZE
   ========================================================= */

function capitalize(value) {

    const text =
        String(value || "");


    return text.charAt(0).toUpperCase() +
        text.slice(1);

}


/* =========================================================
   70. AUTO REFRESH
   ========================================================= */

function initializeAutoRefresh() {

    if (App.refreshTimer) {

        clearInterval(
            App.refreshTimer
        );

    }


    App.refreshTimer =
        setInterval(
            async function () {

                if (
                    document.hidden ||
                    App.loading ||
                    $("#adminFormModal")
                        ?.classList
                        .contains("open")
                ) {

                    return;

                }


                await loadAllData();

            },
            CONFIG.REFRESH_INTERVAL
        );

}


/* =========================================================
   71. ESCAPE / GLOBAL KEYBOARD
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

                return;

            }


            const loginModal =
                $("#loginModal");


            if (
                loginModal &&
                loginModal.classList.contains(
                    "open"
                )
            ) {

                closeLoginModal();

            }

        }
    );

}


/* =========================================================
   72. PAGE VISIBILITY
   ========================================================= */

function initializeVisibilityRefresh() {

    document.addEventListener(
        "visibilitychange",
        async function () {

            if (
                !document.hidden &&
                !App.loading &&
                !$("#adminFormModal")
                    ?.classList
                    .contains("open")
            ) {

                await loadAllData();

            }

        }
    );

}


/* =========================================================
   73. INITIALIZE APP
   ========================================================= */

async function initializeApp() {

    initializeNavigation();

    initializeLogin();

    initializeQuickAccess();

    initializeAddButtons();

    initializeGlobalEscape();

    initializeVisibilityRefresh();

    restoreAdminSession();

    navigateTo(
        "dashboard"
    );

    await loadAllData();

    initializeAutoRefresh();

}


/* =========================================================
   74. DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);
