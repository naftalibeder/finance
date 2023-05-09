"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractor = void 0;
const fs_1 = __importDefault(require("fs"));
const utils_1 = require("../utils");
const getAccountValue = (browserPage, account, credentials) => __awaiter(void 0, void 0, void 0, function* () {
    yield loadAccountsPage(browserPage);
    yield enterCredentials(browserPage, credentials);
    yield enterTwoFactorCode(browserPage);
    const accountValue = yield scrapeAccountValue(browserPage, account);
    return accountValue;
});
const getTransactionData = (browserPage, account, credentials, range) => __awaiter(void 0, void 0, void 0, function* () {
    yield loadHistoryPage(browserPage);
    yield enterCredentials(browserPage, credentials);
    yield enterTwoFactorCode(browserPage);
    const transactionData = yield scrapeTransactionData(browserPage, account, range);
    return transactionData;
});
const loadAccountsPage = (browserPage) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Loading accounts page");
    yield browserPage.goto("https://client.schwab.com/clientapps/accounts/summary");
});
const loadHistoryPage = (browserPage) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Loading history page");
    yield browserPage.goto("https://client.schwab.com/app/accounts/transactionhistory");
});
const enterCredentials = (browserPage, credentials) => __awaiter(void 0, void 0, void 0, function* () {
    let loc;
    // Check if credentials are needed.
    console.log("Checking if credentials are needed");
    const dashboardExists = yield getDashboardExists(browserPage);
    if (dashboardExists) {
        console.log("Dashboard found; skipping credentials");
        return;
    }
    const loginFrame = browserPage.frameLocator("#lmsSecondaryLogin");
    const loginPageExists = yield (0, utils_1.getSelectorExists)(loginFrame, "#loginIdInput", 5000);
    if (!loginPageExists) {
        console.log("Login page not found; skipping credentials");
        return;
    }
    console.log("Login is needed");
    // Input credentials.
    console.log("Entering credentials");
    loc = loginFrame.locator("#loginIdInput");
    yield loc.fill(credentials.username);
    loc = loginFrame.locator("#passwordInput");
    yield loc.fill(credentials.password);
    loc = loginFrame.locator("#btnLogin");
    yield loc.click();
    console.log("Authenticated");
});
const enterTwoFactorCode = (browserPage) => __awaiter(void 0, void 0, void 0, function* () {
    let loc;
    // Check if code is needed.
    console.log("Checking if two-factor code is needed");
    const dashboardExists = yield getDashboardExists(browserPage);
    if (dashboardExists) {
        console.log("Dashboard found; skipping two-factor");
        return;
    }
    const twoFactorFrame = browserPage.frames()[0];
    const twoFactorPageExists = yield (0, utils_1.getSelectorExists)(twoFactorFrame, "#otp_sms", 5000);
    if (!twoFactorPageExists) {
        console.log("Two-factor page not found; skipping two-factor");
        return;
    }
    console.log("Two-factor code is needed");
    loc = twoFactorFrame.locator("#otp_sms");
    yield loc.click();
    // Input code.
    console.log("Entering two-factor code");
    const code = yield (0, utils_1.getUserInput)("Enter the code sent to your phone number:");
    const codeInputFrame = browserPage.frames()[0];
    loc = codeInputFrame.locator("#securityCode");
    yield loc.fill(code);
    loc = codeInputFrame.locator("#checkbox-remember-device");
    yield loc.check();
    loc = codeInputFrame.locator("#continueButton");
    yield loc.click();
});
const scrapeAccountValue = (browserPage, account) => __awaiter(void 0, void 0, void 0, function* () {
    let loc;
    console.log("Getting account value");
    const dashboardFrame = browserPage.frames()[0];
    loc = dashboardFrame
        .locator("single-account")
        .filter({ hasText: account.info.display })
        .locator("div.balance-container-cs > div > span")
        .first();
    let text = yield loc.evaluate((o) => { var _a; return (_a = o.childNodes[2].textContent) !== null && _a !== void 0 ? _a : ""; });
    const price = (0, utils_1.toPrice)(text);
    return price;
});
const scrapeTransactionData = (browserPage, account, range) => __awaiter(void 0, void 0, void 0, function* () {
    let loc;
    // Go to history page.
    console.log("Navigating to export page");
    const dashboardFrame = browserPage.frames()[0];
    loc = dashboardFrame.locator("#meganav-secondary-menu-hist");
    yield loc.click();
    loc = dashboardFrame.locator(".sdps-account-selector");
    yield loc.click();
    loc = dashboardFrame.locator(".sdps-account-selector__list-item", {
        hasText: account.info.number,
    });
    yield loc.click();
    loc = dashboardFrame.locator(".transactions-history-container");
    yield loc.click();
    // Set date range.
    loc = dashboardFrame.locator("#statements-daterange1");
    yield loc.selectOption("Custom");
    loc = dashboardFrame.locator("#calendar-FromDate");
    yield loc.fill(range.start.toLocaleDateString("en-US"));
    loc = dashboardFrame.locator("#calendar-ToDate");
    yield loc.fill(range.end.toLocaleDateString("en-US"));
    loc = dashboardFrame.locator("#btnSearch");
    yield loc.click();
    yield browserPage.waitForLoadState("networkidle");
    // Open export popup.
    console.log("Launching export popup");
    loc = dashboardFrame.locator("#bttnExport button");
    yield loc.click();
    const popupPage = yield browserPage.waitForEvent("popup");
    yield popupPage.waitForLoadState("domcontentloaded");
    yield popupPage.waitForLoadState("networkidle");
    loc = popupPage.locator(".button-primary").first();
    yield loc.click();
    // Get downloaded file.
    console.log("Waiting for download");
    const download = yield browserPage.waitForEvent("download");
    const downloadPath = yield download.path();
    const transactionData = fs_1.default.readFileSync(downloadPath, { encoding: "utf-8" });
    console.log("Downloaded data");
    return transactionData;
});
const getDashboardExists = (browserPage) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const loc = browserPage.frames()[0].locator("#site-header");
        yield loc.waitFor({ state: "attached", timeout: 500 });
        return true;
    }
    catch (e) {
        return false;
    }
});
const extractor = {
    getAccountValue,
    getTransactionData,
};
exports.extractor = extractor;
