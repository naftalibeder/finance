<script lang="ts">
  import { onMount } from "svelte";
  import { UUID } from "crypto";
  import {
    Account,
    Transaction,
    ExtractionStatus,
    Price,
    GetTransactionsApiArgs,
    GetTransactionsApiPayload,
    GetAccountsApiPayload,
    CreateAccountApiPayload,
    UpdateAccountApiArgs,
    UpdateAccountApiPayload,
    // TODO: Fix this error if possible.
    // @ts-ignore
  } from "shared";
  import { post } from "../api";
  import TimeChart from "./TimeChart.svelte";
  import AccountsList from "./AccountsList.svelte";
  import TransactionsList from "./TransactionsList.svelte";
  import MfaInputList from "./MfaInputList.svelte";
  import Lightbox from "./Lightbox.svelte";
  import EditAccount from "./EditAccount.svelte";
  import { TransactionDateGroup } from "../types";

  const zeroPrice: Price = {
    amount: 0,
    currency: "USD",
  };

  let accounts: Account[] = [];
  let accountsSum: Price = zeroPrice;
  $: accountsDict = ((_accounts: Account[]): Record<UUID, Account> => {
    const dict: Record<UUID, Account> = {};
    for (const a of _accounts) {
      dict[a._id] = a;
    }
    return dict;
  })(accounts);

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
  $: extractionStatusKey = Object.keys(extractionStatus.accounts)
    .sort()
    .map((k) => extractionStatus.accounts[k])
    .join(",");
  $: {
    extractionStatusKey;
    fetchAccounts();
  }

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
    onChangeQuery(query);
  }

  let hoverGroup: TransactionDateGroup | undefined;
  let extractionStatusPollInterval: NodeJS.Timer | undefined;

  let accountIdShowingDetail: UUID | undefined = undefined;
  $: accountShowingDetail = accounts.find(
    (o) => o._id === accountIdShowingDetail
  );

  onMount(async () => {
    isLoading = true;
    await fetchAll();
    isLoading = false;
  });

  const fetchAll = async () => {
    await fetchAccounts();
    await fetchTransactions(query);
    await fetchExtractionStatus();

    if (Object.keys(extractionStatus.accounts).length > 0) {
      pollExtractionStatus();
    }
  };

  const fetchAccounts = async () => {
    try {
      const payload = await post<GetAccountsApiPayload>("accounts");
      accounts = payload.data.accounts;
      accountsSum = payload.data.sum;
      console.log(`Fetched ${accounts.length} accounts`);
    } catch (e) {
      console.log("Error fetching accounts:", e);
    }
  };

  const createAccount = async () => {
    try {
      const payload = await post<CreateAccountApiPayload>("accounts/create");
      accounts = [...accounts, payload.data.account];
    } catch (e) {
      console.log("Error creating account:", e);
    }
  };

  const updateAccount = async (account: Account) => {
    try {
      const payload = await post<UpdateAccountApiPayload, UpdateAccountApiArgs>(
        "accounts/update",
        {
          _id: account._id,
          bankId: account.bankId,
          display: account.display,
          number: account.number,
          kind: account.kind,
          type: account.type,
        }
      );
      await fetchAccounts();
    } catch (e) {
      console.log("Error updating account:", e);
    }
  };

  const fetchTransactions = async (q: string) => {
    try {
      const payload = await post<
        GetTransactionsApiPayload,
        GetTransactionsApiArgs
      >("transactions", { query: q });
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
      extractionStatus = await post<ExtractionStatus>("status");
    } catch (e) {
      console.log("Error fetching extraction status:", e);
    }
  };

  const pollExtractionStatus = () => {
    extractionStatusPollInterval = setInterval(async () => {
      await fetchExtractionStatus();
      console.log("Extraction status:", extractionStatus);

      if (Object.keys(extractionStatus.accounts).length === 0) {
        clearInterval(extractionStatusPollInterval);
        await fetchAll();
      }
    }, 1000);
  };

  const onClickSendMfaCode = async (bankId: string, code: string) => {
    try {
      await post("mfa", { bankId, code });
    } catch (e) {
      console.log("Error sending mfa code:", e);
    }
  };
  const onClickExtract = async (accountIds?: string[]) => {
    pollExtractionStatus();
    await post<undefined, { accountIds?: string[] }>("extract", { accountIds });
  };

  const onChangeQuery = async (q: string) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      await fetchTransactions(q);
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
      <MfaInputList
        mfaInfos={extractionStatus.mfaInfos}
        onClickSend={onClickSendMfaCode}
      />
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
      onClickCreate={createAccount}
      onClickAccount={(id) => {
        accountIdShowingDetail = id;
      }}
      {onClickExtract}
    />

    <TransactionsList
      transactions={transactionsFiltered}
      transactionsSumPrice={transactionsFilteredSumPrice}
      transactionsCt={transactionsFilteredCt}
      {transactionsOverallCt}
      activeGroup={hoverGroup}
      {query}
      {accountsDict}
    />
  </div>

  {#if accountShowingDetail}
    <Lightbox
      onPressDismiss={() => {
        accountIdShowingDetail = undefined;
      }}
    >
      <EditAccount account={accountShowingDetail} onSubmit={updateAccount} />
    </Lightbox>
  {/if}
</div>
