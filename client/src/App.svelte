<script lang="ts">
  import { onMount } from "svelte";
  import { Account, Transaction } from "shared";

  const serverUrl = import.meta.env.VITE_SERVER_URL;

  let accounts: Account[] = [];
  let transactions: Transaction[] = [];

  let extractStatus: string = "";

  onMount(async () => {
    try {
      const accountsRes = await fetch(`${serverUrl}/accounts`, {
        method: "POST",
      });
      accounts = await accountsRes.json();

      const transactionsRes = await fetch(`${serverUrl}/transactions`, {
        method: "POST",
      });
      transactions = await transactionsRes.json();
    } catch (e) {
      console.log(e);
    }
  });

  const onClickRefresh = async () => {
    const res = await fetch(`${serverUrl}/extract`, {
      method: "POST",
    });
    let reader = res.body.getReader();

    let result: ReadableStreamReadResult<Uint8Array>;
    let decoder = new TextDecoder("utf8");

    while (!result?.done) {
      result = await reader.read();
      let chunk = decoder.decode(result.value);
      extractStatus = chunk;
    }

    extractStatus = "";
  };

  const formatCurrency = (a: any) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: a.currency,
    }).format(a.amount);
  };
</script>

<div class="container">
  <div class="row">
    <p><b>{accounts.length} accounts</b></p>
    <button class="text" on:click={() => onClickRefresh()}>Refresh all</button>
  </div>

  <table>
    {#each accounts as a}
      <tr>
        <td>{a.id}</td>
        <td class="currency">{formatCurrency(a.price)}</td>
      </tr>
    {/each}
  </table>

  <p><b>{transactions.length} transactions</b></p>
  <table>
    {#each transactions as t}
      <tr>
        <td>{t.date}</td>
        <td>{t.accountId}</td>
        <td>{t.payee}</td>
        <td class="currency">{formatCurrency(t.price)}</td>
      </tr>
    {/each}
  </table>
</div>

<style>
  table {
    width: 100%;
  }

  tr:hover {
    color: rgb(165, 165, 165);
  }

  td {
    padding-top: 2px;
    padding-bottom: 2px;
  }

  button.text {
    color: white;
    background-color: transparent;
    padding: 0px;
  }

  .container {
    display: flex;
    flex-direction: column;
    row-gap: 16px;
  }

  .row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .currency {
    text-align: right;
  }
</style>
