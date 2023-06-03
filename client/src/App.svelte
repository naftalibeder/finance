<script lang="ts">
  import { onMount } from "svelte";
  import {
    Account,
    Transaction,
    ExtractionStatus,
    Price,
    TransactionsApiArgs,
    TransactionsApiPayload,
    AccountsApiPayload,
    // TODO: Fix this error if possible.
    // @ts-ignore
  } from "shared";
  import { secAgo, prettyDate, prettyCurrency } from "../utils";

  const serverUrl = import.meta.env.VITE_SERVER_URL;

  let accounts: Account[] = [];
  let accountsSum: Price = { amount: 0, currency: "USD" };
  let activeAccountsDict: Record<string, boolean> = {};

  let transactions: Transaction[] = [];
  let transactionsSum: Price = { amount: 0, currency: "USD" };
  let transactionsSectionText = "";

  let isLoading = false;

  let extractionStatus: ExtractionStatus = {
    status: "idle",
    accountId: undefined,
    mfaInfos: [],
  };
  let statusDisplay: string | undefined;
  $: {
    switch (extractionStatus.status) {
      case "idle":
        statusDisplay = undefined;
        break;
      case "set-up":
        statusDisplay = "Setting up";
        break;
      case "run-extractor":
        statusDisplay = `Extracting ${extractionStatus.accountId}`;
        break;
      case "wait-for-mfa":
        statusDisplay = "Waiting for code";
        break;
      case "tear-down":
        statusDisplay = "Closing down";
        break;
    }
  }

  let searchTimer: NodeJS.Timer | undefined;
  let searchInputField;
  let isSearchFocused = false;
  let query = "";
  $: {
    query;
    onChangeQuery();
  }

  let mfaPollInterval: NodeJS.Timer | undefined;
  let isSendingMfaCode = false;

  onMount(async () => {
    isLoading = true;
    await fetchAll();
    isLoading = false;
  });

  const fetchAll = async () => {
    await fetchAccounts();
    await fetchTransactions();
    await fetchExtractionStatus();

    if (extractionStatus.status !== "idle") {
      pollExtractionStatus();
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${serverUrl}/accounts`, {
        method: "POST",
      });
      const payload = (await res.json()) as AccountsApiPayload;
      accounts = payload.data.accounts;
      accounts.forEach((o) => {
        if (activeAccountsDict[o.id] === undefined) {
          activeAccountsDict[o.id] = true;
        }
      });
      accountsSum = payload.data.sum;
      console.log(`Fetched ${accounts.length} accounts`);
    } catch (e) {
      console.log("Error fetching accounts:", e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const args: TransactionsApiArgs = { query };
      const res = await fetch(`${serverUrl}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(args).toString(),
      });
      const payload = (await res.json()) as TransactionsApiPayload;
      transactions = payload.data.filteredTransactions;
      transactionsSum = payload.data.filteredSum;
      console.log(
        `Fetched ${transactions.length} transactions with a sum of ${transactionsSum.amount}`
      );

      let baseSectionText = "";
      if (payload.data.filteredCt === payload.data.totalCt) {
        baseSectionText = `${payload.data.totalCt} transactions`;
      } else {
        baseSectionText = `${payload.data.filteredCt} of ${payload.data.totalCt} transactions`;
      }
      if (query.length > 0) {
        transactionsSectionText = `${baseSectionText} (matching "${query}")`;
      } else {
        transactionsSectionText = baseSectionText;
      }
    } catch (e) {
      console.log("Error fetching transactions:", e);
    }
  };

  const fetchExtractionStatus = async () => {
    try {
      const extractionStatusRes = await fetch(`${serverUrl}/status`, {
        method: "POST",
      });
      extractionStatus = await extractionStatusRes.json();
    } catch (e) {
      console.log("Error fetching extraction status:", e);
    }
  };

  const pollExtractionStatus = () => {
    mfaPollInterval = setInterval(async () => {
      await fetchExtractionStatus();
      console.log("Extraction status:", extractionStatus);

      if (extractionStatus.status === "idle") {
        clearInterval(mfaPollInterval);
      }
    }, 1000);
  };

  const onClickExtract = async (accountIds?: string[]) => {
    pollExtractionStatus();
    extractionStatus.status = "set-up";

    const args = { accountIds: JSON.stringify(accountIds) };
    await fetch(`${serverUrl}/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(args).toString(),
    });
  };

  const onClickSendMfaCode = async (bankId: string, code: string) => {
    isSendingMfaCode = true;

    try {
      const data = { bankId, code };
      const res = await fetch(`${serverUrl}/mfa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(data).toString(),
      });
    } catch (e) {
      console.log("Error sending mfa code:", e);
    }

    isSendingMfaCode = false;
  };

  const onChangeQuery = async () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      await fetchTransactions();
    }, 100);
  };

  const focusSearch = () => {
    searchInputField.focus();
  };

  const blurSearch = () => {
    searchInputField.blur();
  };

  document.addEventListener("keydown", (evt) => {
    if (evt.metaKey && evt.key === "k") {
      evt.preventDefault();
      focusSearch();
    } else if (evt.key === "Escape") {
      evt.preventDefault();
      searchInputField.value = "";
      query = "";
      blurSearch();
    }
  });
</script>

<div class="container">
  <div class="content">
    <div class="header">
      <div class="row">
        <h1 style={"flex: 2"}>Transactions</h1>
        <input
          id={"search-input"}
          style={"flex: 1"}
          placeholder={isSearchFocused ? "Type to search" : "Search (⌘K)"}
          on:focus={() => (isSearchFocused = true)}
          on:blur={() => (isSearchFocused = false)}
          bind:value={query}
          bind:this={searchInputField}
        />
      </div>
    </div>

    {#if extractionStatus.mfaInfos.length > 0}
      <div class="section">
        <div class="row">
          <p><b>Code needed</b></p>
        </div>
        {#each extractionStatus.mfaInfos as mfaInfo}
          <div class="row">
            <label for={mfaInfo.bankId}>{mfaInfo.bankId}</label>
            <input
              id={mfaInfo.bankId}
              placeholder="Enter code"
              disabled={isSendingMfaCode}
            />
            <button
              class="outline"
              on:click={(evt) => {
                // @ts-ignore
                const code = document.getElementById(mfaInfo.bankId).value;
                onClickSendMfaCode(mfaInfo.bankId, code);
              }}
              disabled={isSendingMfaCode}
            >
              Send code
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <div class="section">
      <div class="grid accounts">
        <div class="grid contents tall">
          <div class="cell account-section title">
            {accounts.length} accounts
          </div>
          <div class="cell account-section action">
            {prettyCurrency(accountsSum)}
          </div>
          <div class="cell account gutter-r">
            {#if extractionStatus.accountId}
              <div>...</div>
            {:else}
              <button on:click={() => onClickExtract()}>↻</button>
            {/if}
          </div>
        </div>

        {#each accounts as a}
          <div class="grid contents">
            <!-- <div class="cell account gutter-l">
                <Checkbox
                  active={activeAccountsDict[a.id] === true}
                  onClick={() => {
                    activeAccountsDict[a.id] = !activeAccountsDict[a.id];
                  }}
                />
              </div> -->
            <div class="cell account name">
              {a.id}
            </div>
            <div class="cell account price">{prettyCurrency(a.price)}</div>
            <div class="cell account gutter-r">
              {#if a.id === extractionStatus.accountId}
                <div>...</div>
              {:else}
                <button on:click={() => onClickExtract([a.id])}>↻</button>
              {/if}
            </div>
            <!-- <div class="cell account timestamp">
              {prettyDate(a.updatedAt, { includeTime: true }) ??
                "Never updated"}
            </div> -->
          </div>
        {/each}
      </div>
    </div>

    <div class="section">
      <div class="grid transactions">
        <div class="grid contents tall">
          <div class="cell transaction-section title">
            {transactionsSectionText}
          </div>
          <div class="cell transaction-section action">
            {prettyCurrency(transactionsSum)}
          </div>
        </div>

        {#each transactions as t}
          <div
            class={`grid contents ${
              secAgo(t.meta?.createdAt) < 60 * 5 ? "recent" : ""
            }`}
          >
            <div class="cell transaction date">
              {prettyDate(t.date, { includeTime: false })}
            </div>
            <div class="cell transaction account">{t.accountId}</div>
            <div class="cell transaction payee">{t.payee}</div>
            <div class="cell transaction description">{t.description}</div>
            <div class="cell transaction type">{t.type}</div>
            <div class="cell transaction price">
              {prettyCurrency(t.price)}
            </div>
            <!-- <div class="cell transaction timestamp">
              {prettyDate(t.createdAt, { includeTime: true })}
            </div> -->
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  :root {
    --gutter: 40px;
  }

  .container {
    display: flex;
    justify-content: center;
  }

  .content {
    display: flex;
    flex: 1;
    flex-direction: column;
    row-gap: 48px;
    max-width: 1440px;
    padding: 0px 0px;
  }

  .header {
    padding: 0px var(--gutter);
  }

  .section {
    display: flex;
    flex-direction: column;
    row-gap: 24px;
  }

  .row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    column-gap: 16px;
  }

  .grid {
    display: grid;
    grid-template-rows: auto;
  }

  .grid.contents {
    display: contents;
  }

  .grid.contents:hover .cell {
    opacity: 0.5;
  }

  .grid.contents.recent {
    color: #90cbff;
  }

  .grid.contents.tall > .cell {
    padding-top: 16px;
    padding-bottom: 16px;
  }

  .cell {
    padding: 4px 0px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .grid.accounts {
    grid-template-areas: "gutter-l name status price gutter-r";
    grid-template-columns: var(--gutter) 1fr 2fr auto var(--gutter);
  }

  .cell.account-section.title {
    grid-column: name / status;
  }

  .cell.account-section.action {
    grid-column: price;
    text-align: right;
  }

  .cell.account.gutter-l {
    grid-column-start: gutter-l;
    text-align: right;
    padding-right: 8px;
  }

  .cell.account.name {
    grid-column-start: name;
  }

  .cell.account.status {
    grid-column-start: status;
  }

  .cell.account.price {
    grid-column-start: price;
    text-align: right;
  }

  .cell.account.gutter-r {
    grid-column-start: gutter-r;
    padding-left: 8px;
  }

  .grid.transactions {
    grid-template-areas: "gutter-l date account payee description type price gutter-r";
    grid-template-columns: var(--gutter) auto 1fr 2fr 1fr 1fr auto var(--gutter);
  }

  .cell.transaction-section.title {
    grid-column: date / type;
  }

  .cell.transaction-section.action {
    grid-column: price;
    text-align: right;
  }

  .cell.transaction.gutter-l {
    grid-column-start: gutter-l;
    text-align: right;
    padding-right: 8px;
  }

  .cell.transaction.date {
    grid-column-start: date;
    padding-right: 8px;
  }

  .cell.transaction.account {
    grid-column-start: account;
  }

  .cell.transaction.description {
    grid-column-start: description;
  }

  .cell.transaction.type {
    grid-column-start: type;
  }

  .cell.transaction.payee {
    grid-column-start: payee;
  }

  .cell.transaction.price {
    grid-column-start: price;
    text-align: right;
  }

  .cell.transaction.gutter-r {
    grid-column-start: gutter-r;
    padding-left: 8px;
  }
</style>
