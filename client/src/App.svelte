<script lang="ts">
  import { onMount } from "svelte";
  import {
    Account,
    Transaction,
    ExtractionStatus,
    // TODO: Fix this error if possible.
    // @ts-ignore
  } from "shared";
  import { secAgo, prettyDate } from "../utils";

  const serverUrl = import.meta.env.VITE_SERVER_URL;

  let accounts: Account[] = [];
  let transactions: Transaction[] = [];
  let transactionsFiltered: Transaction[] = [];
  $: {
    transactionsFiltered = transactions.filter(
      (o) => visibleAccounts[o.accountId] === true
    );
  }
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

  var visibleAccounts: Record<string, boolean> = {};

  let mfaPollInterval: NodeJS.Timer | undefined;
  let isSendingMfaCode = false;

  onMount(async () => {
    await fetchAll();
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
      const accountsRes = await fetch(`${serverUrl}/accounts`, {
        method: "POST",
      });
      accounts = await accountsRes.json();
      accounts.forEach((o) => {
        if (visibleAccounts[o.id] === undefined) {
          visibleAccounts[o.id] = true;
        }
      });
    } catch (e) {
      console.log("Error fetching accounts:", e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const transactionsRes = await fetch(`${serverUrl}/transactions`, {
        method: "POST",
      });
      transactions = await transactionsRes.json();
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

  const onClickExtract = async () => {
    pollExtractionStatus();
    extractionStatus.status = "set-up";
    await fetch(`${serverUrl}/extract`, {
      method: "POST",
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

  const formatCurrency = (a: any) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: a.currency,
    }).format(a.amount);
  };
</script>

<div class="container">
  <div class="content">
    <h1>Transactions</h1>

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
      <div class="grid section">
        <div class="cell section title">{accounts.length} accounts</div>
        <div class="cell section action">
          {#if !statusDisplay}
            <button class="text" on:click={() => onClickExtract()}>
              Refresh all
            </button>
          {:else}
            <div class="faded">{statusDisplay}</div>
          {/if}
        </div>
      </div>

      <div class="grid accounts">
        {#each accounts as a}
          <div class="grid row">
            <div class="cell account toggle">
              <button
                class="icon"
                on:click={() =>
                  (visibleAccounts[a.id] = !visibleAccounts[a.id])}
              >
                {visibleAccounts[a.id] === true ? "[x]" : "[ ]"}
              </button>
            </div>
            <div class="cell account name">{a.id}</div>
            <div class="cell account price">{formatCurrency(a.price)}</div>
            <!-- <div class="cell account timestamp">
              {prettyDate(a.updatedAt, { includeTime: true }) ??
                "Never updated"}
            </div> -->
          </div>
        {/each}
      </div>
    </div>

    <div class="section">
      <div class="grid section">
        <div class="cell section title">
          {transactionsFiltered.length} of {transactions.length} transactions
        </div>
      </div>

      <div class="grid transactions">
        {#each transactionsFiltered as t}
          <div
            class={`grid row ${
              secAgo(t.meta?.createdAt) < 60 * 5 ? "recent" : ""
            }`}
          >
            <div class="cell transaction date">
              {prettyDate(t.date, { includeTime: false })}
            </div>
            <div class="cell transaction account">{t.accountId}</div>
            <div class="cell transaction payee">{t.payee}</div>
            <div class="cell transaction price">{formatCurrency(t.price)}</div>
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
  .container {
    display: flex;
    justify-content: center;
  }

  .content {
    display: flex;
    flex: 1;
    flex-direction: column;
    row-gap: 48px;
    max-width: 1280px;
    padding: 0px 120px;
  }

  .section {
    display: flex;
    flex-direction: column;
    row-gap: 32px;
  }

  .grid {
    display: grid;
    column-gap: 16px;
    grid-template-rows: auto;
  }

  .grid.section {
    grid-template-areas: "title action";
    grid-template-columns: 1fr auto;
  }

  .grid.accounts {
    grid-template-areas: "toggle name price";
    grid-template-columns: auto 6fr 2fr;
  }

  .grid.transactions {
    grid-template-areas: "date account payee price";
    grid-template-columns: auto 2fr 5fr 1fr;
  }

  .grid.row {
    display: contents;
  }

  .grid.row:hover .cell {
    opacity: 0.5;
  }

  .grid.row.recent {
    color: #90cbff;
  }

  .cell {
    padding: 4px 0px;
    white-space: nowrap;
  }

  .cell.section.title {
    grid-column-start: title;
  }

  .cell.section.action {
    grid-column-start: action;
  }

  .cell.account.toggle {
    grid-column-start: toggle;
  }

  .cell.account.name {
    grid-column-start: name;
  }

  .cell.account.price {
    grid-column-start: price;
    text-align: right;
  }

  .cell.transaction.date {
    grid-column-start: date;
  }

  .cell.transaction.account {
    grid-column-start: account;
  }

  .cell.transaction.payee {
    grid-column-start: payee;
  }

  .cell.transaction.price {
    grid-column-start: price;
    text-align: right;
  }

  button.icon {
    margin: 0px;
    padding: 0px;
    outline: none;
  }
</style>
