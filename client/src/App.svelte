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
  import { prettyDate } from "../utils";

  const serverUrl = import.meta.env.VITE_SERVER_URL;

  let accounts: Account[] = [];
  let transactions: Transaction[] = [];
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

  onMount(async () => {
    await fetchAll();
  });

  const fetchAll = async () => {
    try {
      const accountsRes = await fetch(`${serverUrl}/accounts`, {
        method: "POST",
      });
      accounts = await accountsRes.json();

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
      <p>{accounts.length} accounts</p>
      {#if !statusDisplay}
        <button class="text" on:click={() => onClickExtract()}>
          Refresh all
        </button>
      {:else}
        <div class="faded">{statusDisplay}</div>
      {/if}
    </div>
    <div class="grid account">
      {#each accounts as a}
        <div class="grid row">
          <div class="cell">{a.id}</div>
          <div class="cell timestamp">
            {a.updatedAt ? prettyDate(a.updatedAt) : "Never updated"}
          </div>
          <div class="cell currency">{formatCurrency(a.price)}</div>
        </div>
      {/each}
    </div>
  </div>

  <div class="section">
    <div class="grid section">
      <p>{transactions.length} transactions</p>
    </div>
    <div class="grid transaction">
      {#each transactions as t}
        <div class="grid row">
          <div class="cell">{t.date}</div>
          <div class="cell">{t.accountId}</div>
          <div class="cell">{t.payee}</div>
          <div class="cell currency">{formatCurrency(t.price)}</div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    row-gap: 48px;
  }

  .section {
    display: flex;
    flex-direction: column;
    row-gap: 32px;
  }

  .grid {
    display: grid;
    grid-template-rows: auto;
    grid-gap: 8px;
    column-gap: 16px;
  }

  .grid.section {
    grid-template-columns: 1fr auto;
  }

  .grid.account {
    grid-template-columns: auto 1fr auto;
  }

  .grid.transaction {
    grid-template-columns: auto auto 1fr auto;
  }

  .grid.row {
    display: contents;
  }

  .grid.row:hover .cell {
    opacity: 0.6;
  }

  .cell.currency {
    text-align: right;
  }

  .cell.timestamp {
    opacity: 0.6;
  }
</style>
