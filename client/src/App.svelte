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
  import TimeChart from "./TimeChart.svelte";
  import AccountsList from "./AccountsList.svelte";
  import TransactionsList from "./TransactionsList.svelte";
  import { TransactionDateGroup } from "../types";

  const serverUrl = import.meta.env.VITE_SERVER_URL;

  const zeroPrice: Price = {
    amount: 0,
    currency: "USD",
  };

  let accounts: Account[] = [];
  let accountsSum: Price = zeroPrice;
  let activeAccountsDict: Record<string, boolean> = {};

  let transactionsFiltered: Transaction[] = [];
  let transactionsFilteredCt = 0;
  let transactionsFilteredSumPrice: Price = zeroPrice;
  let transactionsOverallCt = 0;
  let transactionsOverallSumPrice: Price = zeroPrice;
  let transactionsOverallMaxPrice: Price = zeroPrice;
  let transactionsOverallEarliestDate: string | undefined;

  let isLoading = false;

  let extractionStatus: ExtractionStatus = {
    accounts: {},
    mfaInfos: [],
  };

  let searchTimer: NodeJS.Timer | undefined;
  let searchInputFieldRef;
  let isSearchFocused = false;
  let searchPlaceholderText: string;
  $: {
    if (!isSearchFocused) {
      searchPlaceholderText = "Search (⌘K)";
    } else {
      const options: string[] = [
        "coffee",
        accounts[Math.floor(Math.random() * accounts.length)].display,
        ">250 <350",
        "<15.20",
        ">2000",
        "~10",
      ];
      const randOption = options[Math.floor(Math.random() * options.length)];
      searchPlaceholderText = `E.g. ${randOption}`;
    }
  }
  let query = "";
  $: {
    query;
    onChangeQuery();
  }

  let hoverGroup: TransactionDateGroup | undefined;

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

    if (Object.keys(extractionStatus.accounts).length > 0) {
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
        if (activeAccountsDict[o._id] === undefined) {
          activeAccountsDict[o._id] = true;
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
      transactionsFiltered = payload.data.filteredTransactions;
      transactionsFilteredCt = payload.data.filteredCt;
      transactionsFilteredSumPrice = payload.data.filteredSumPrice;
      transactionsOverallCt = payload.data.overallCt;
      transactionsOverallSumPrice = payload.data.filteredSumPrice;
      transactionsOverallMaxPrice = payload.data.overallMaxPrice;
      transactionsOverallEarliestDate = payload.data.overallEarliestDate;
      console.log(
        `Fetched ${transactionsFiltered.length} transactions with a sum of ${transactionsFilteredSumPrice.amount}`
      );
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

      if (Object.keys(extractionStatus.accounts).length === 0) {
        clearInterval(mfaPollInterval);
        await fetchAll();
      }
    }, 1000);
  };

  const onClickExtract = async (accountIds?: string[]) => {
    pollExtractionStatus();

    const args = {};
    if (accountIds) {
      args["accountIds"] = JSON.stringify(accountIds);
    }
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

  document.addEventListener("keydown", (evt) => {
    if (evt.metaKey && evt.key === "k") {
      evt.preventDefault();
      searchInputFieldRef.focus();
    } else if (evt.key === "Escape") {
      evt.preventDefault();
      searchInputFieldRef.value = "";
      query = "";
      searchInputFieldRef.blur();
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
          placeholder={searchPlaceholderText}
          on:focus={() => (isSearchFocused = true)}
          on:blur={() => (isSearchFocused = false)}
          bind:value={query}
          bind:this={searchInputFieldRef}
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

    <TimeChart
      transactions={transactionsFiltered}
      {transactionsOverallMaxPrice}
      {transactionsOverallEarliestDate}
      onHoverGroup={(group) => {
        hoverGroup = group;
      }}
    />

    <AccountsList
      {accounts}
      {accountsSum}
      {extractionStatus}
      {onClickExtract}
    />

    <TransactionsList
      transactions={transactionsFiltered}
      transactionsSumPrice={transactionsFilteredSumPrice}
      transactionsCt={transactionsFilteredCt}
      {transactionsOverallCt}
      activeGroup={hoverGroup}
      {query}
    />
  </div>
</div>
