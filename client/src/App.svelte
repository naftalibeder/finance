<script lang="ts">
  import { onMount } from "svelte";

  const serverUrl = `http://0.0.0.0:${import.meta.env.VITE_SERVER_PORT}`;

  let accounts: any[] = [];
  let transactions: any[] = [];

  onMount(async () => {
    const accountsRes = await fetch(`${serverUrl}/accounts`, {
      method: "POST",
    });
    accounts = await accountsRes.json();

    const transactionsRes = await fetch(`${serverUrl}/transactions`, {
      method: "POST",
    });
    transactions = await transactionsRes.json();
  });

  const onClickRefresh = async () => {
    await fetch(`${serverUrl}/extract`, {
      method: "POST",
    });
  };

  const formatCurrency = (a: any) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: a.currency,
    }).format(a.amount);
  };
</script>

<div>
  <button on:click={() => onClickRefresh()}>Refresh</button>

  <p><b>{accounts.length} accounts</b></p>
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
  p {
    margin-top: 32px;
  }

  table {
    width: 100%;
  }

  td {
    padding-top: 2px;
    padding-bottom: 2px;
  }

  .currency {
    text-align: right;
  }
</style>
