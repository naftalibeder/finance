<script lang="ts">
  import { onMount } from "svelte";
  import {
    Account,
    ProgressUpdate,
    ConfigBankId,
    MfaInfo,
    Transaction,
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
  let mfaInfos: MfaInfo[] = [];

  let progress: ProgressUpdate = {
    status: "idle",
  };

  let statusDisplay: string | undefined;
  $: {
    switch (progress.status) {
      case "idle":
        statusDisplay = undefined;
        break;
      case "set-up":
        statusDisplay = "Setting up";
        break;
      case "run-extractor":
        statusDisplay = "Running extractor";
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

  onMount(async () => {
    await fetchAll();
  });

  const fetchAll = async () => {
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

      const transactionsRes = await fetch(`${serverUrl}/transactions`, {
        method: "POST",
      });
      transactions = await transactionsRes.json();

      const mfaInfosRes = await fetch(`${serverUrl}/mfa`, {
        method: "GET",
      });
      mfaInfos = await mfaInfosRes.json();
    } catch (e) {
      console.log(e);
    }
  };

  const onClickExtract = async () => {
    const res = await fetch(`${serverUrl}/extract`, {
      method: "POST",
    });
    let reader = res.body.getReader();

    let result: ReadableStreamReadResult<Uint8Array>;
    let decoder = new TextDecoder("utf8");

    while (!result?.done) {
      result = await reader.read();
      const chunkStr = decoder.decode(result.value);
      console.log(`Received chunk: ${chunkStr}`);

      try {
        const chunk: ProgressUpdate = JSON.parse(chunkStr);
        progress = { ...progress, ...chunk };
      } catch (e) {
        progress = { status: "idle" };
      }

      if (progress.status === "wait-for-mfa") {
        await fetchAll();
      }
    }
  };

  const onClickSendCode = async (bankId: ConfigBankId, code: string) => {
    const data = {
      bankId,
      code,
    };
    const res = await fetch(`${serverUrl}/mfa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(data).toString(),
    });
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

    {#if mfaInfos.length > 0}
      <div class="section">
        <div class="row">
          <p><b>Code needed</b></p>
        </div>
        {#each mfaInfos as mfaInfo}
          <div class="row">
            <label for={mfaInfo.bankId}>{mfaInfo.bankId}</label>
            <input id={mfaInfo.bankId} placeholder="Enter code" />
            <button
              on:click={(evt) => {
                // @ts-ignore
                const code = document.getElementById(mfaInfo.bankId).value;
                onClickSendCode(mfaInfo.bankId, code);
              }}
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
            class={`grid row ${secAgo(t.createdAt) < 60 * 5 ? "recent" : ""}`}
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
    grid-template-columns: 1fr 6fr 2fr;
  }

  .grid.transactions {
    grid-template-areas: "date account payee price";
    grid-template-columns: 1fr 2fr 5fr 1fr;
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
