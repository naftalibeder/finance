<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { UUID } from "crypto";
  import {
    Account,
    Transaction,
    Price,
    GetTransactionsApiArgs,
    GetTransactionsApiPayload,
    GetAccountsApiPayload,
    CreateAccountApiPayload,
    UpdateAccountApiArgs,
    UpdateAccountApiPayload,
    GetBanksApiPayload,
    Bank,
    BankCreds,
    UpdateBankCredsApiArgs,
    DeleteAccountApiArgs,
    GetExtractionsApiPayload,
    Extraction,
    GetExtractionsUnfinishedApiPayload,
    AddExtractionsApiArgs,
    MfaInfo,
    GetMfaInfoApiPayload,
  } from "shared";
  import { post } from "../api";
  import {
    TimeChart,
    AccountsList,
    TransactionsList,
    EditAccount,
    MfaInputList,
    Lightbox,
    Extractions,
    Icon,
  } from ".";
  import { TransactionDateGroup } from "../types";
  import { delay } from "../utils";

  const zeroPrice: Price = {
    amount: 0,
    currency: "USD",
  };

  let banks: Bank[] = [];
  let accounts: Account[] = [];
  let accountsSum: Price = zeroPrice;
  $: accountsDict = ((_accounts: Account[]): Record<UUID, Account> => {
    const dict: Record<UUID, Account> = {};
    for (const a of _accounts) {
      dict[a._id] = a;
    }
    return dict;
  })(accounts);
  let bankCredsExistMap: Record<string, boolean> = {};

  let transactions: Transaction[] = [];
  let transactionsCt = 0;
  let transactionsSumPrice: Price = zeroPrice;
  let transactionsTotalCt = 0;
  let transactionsTotalSumPrice: Price = zeroPrice;
  let transactionsTotalMaxPrice: Price = zeroPrice;
  let transactionsTotalEarliestDate: string | undefined;
  let transactionsResponseQuery: string = "";

  let isLoading = false;

  /** A list of all extractions ever completed or in progress. */
  let extractions: Extraction[] = [];
  /** A list of all extractions currently in progress. */
  let unfinishedExtractions: Extraction[] = [];
  /** Multi-factor request information for an extraction currently in progress. */
  let extractionMfaInfos: MfaInfo[] = [];

  let searchTimer: NodeJS.Timer | undefined;
  let searchInputFieldRef: HTMLInputElement;
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

  let isShowingExtractionsHistory = false;

  let hoverGroup: TransactionDateGroup | undefined;

  let accountIdShowingDetail: UUID | undefined = undefined;
  $: accountShowingDetail = accounts.find(
    (o) => o._id === accountIdShowingDetail
  );

  onMount(async () => {
    document.addEventListener("keydown", onKeyPress);

    isLoading = true;
    await fetchAll();
    isLoading = false;
  });

  onDestroy(() => {
    document.removeEventListener("keydown", onKeyPress);
  });

  const fetchAll = async () => {
    await fetchBanks();
    await fetchAccounts();
    await fetchTransactions(query);
    await fetchExtractionStatus();
  };

  const fetchBanks = async () => {
    try {
      const payload = await post<undefined, GetBanksApiPayload>("banks");
      banks = payload.data.banks;
      bankCredsExistMap = payload.data.credsExistMap;
      console.log(`Fetched ${banks.length} banks`);
    } catch (e) {
      console.log("Error fetching banks:", e);
    }
  };

  const fetchAccounts = async () => {
    try {
      const payload = await post<undefined, GetAccountsApiPayload>("accounts");
      accounts = payload.data.accounts;
      accountsSum = payload.data.sum;
      console.log(`Fetched ${accounts.length} accounts`);
    } catch (e) {
      console.log("Error fetching accounts:", e);
    }
  };

  const createAccount = async () => {
    try {
      const payload = await post<undefined, CreateAccountApiPayload>(
        "accounts/create"
      );
      accounts = [...accounts, payload.data.account];
    } catch (e) {
      console.log("Error creating account:", e);
    }
  };

  const updateAccount = async (account: Account) => {
    try {
      await post<UpdateAccountApiArgs, UpdateAccountApiPayload>(
        "accounts/update",
        {
          account: {
            _id: account._id,
            bankId: account.bankId,
            display: account.display,
            number: account.number,
            kind: account.kind,
            type: account.type,
            preferredMfaOption: "sms",
          },
        }
      );
      await fetchAccounts();
    } catch (e) {
      console.log("Error updating account:", e);
    }
  };

  const deleteAccount = async (accountId: UUID) => {
    try {
      await post<DeleteAccountApiArgs, undefined>("accounts/delete", {
        accountId,
      });
      accountIdShowingDetail = undefined;
      await fetchAccounts();
    } catch (e) {
      console.log("Error deleting account:", e);
    }
  };

  const updateBankCreds = async (bankId: string, creds: BankCreds) => {
    try {
      await post<UpdateBankCredsApiArgs, undefined>("banks/updateCredentials", {
        bankId,
        username: creds.username,
        password: creds.password,
      });
    } catch (e) {
      console.log("Error updating bank credentials:", e);
    }
  };

  const fetchTransactions = async (q: string) => {
    try {
      const payload = await post<
        GetTransactionsApiArgs,
        GetTransactionsApiPayload
      >("transactions", {
        query: q,
        pagination: {
          start: 0,
          limit: 1000,
        },
      });
      transactions = payload.data.transactions;
      transactionsCt = payload.data.pagination.ct;
      transactionsSumPrice = payload.data.sum;
      transactionsTotalCt = payload.data.pagination.totalCt;
      transactionsTotalSumPrice = payload.data.totalSum;
      transactionsTotalMaxPrice = payload.data.totalMax;
      transactionsTotalEarliestDate = payload.data.totalEarliest;
      transactionsResponseQuery = q;
      console.log(
        `Fetched ${transactions.length} of ${transactionsTotalCt} transactions with a sum of ${transactionsSumPrice.amount}`
      );
    } catch (e) {
      transactionsResponseQuery = q;
      console.log("Error fetching transactions:", e);
    }
  };

  const fetchExtractions = async () => {
    try {
      const payload = await post<undefined, GetExtractionsApiPayload>(
        "extractions"
      );
      extractions = payload.data.extractions;
    } catch (e) {
      console.log("Error getting extractions:", e);
    }
  };

  const fetchExtractionStatus = async () => {
    try {
      const extractionPayload = await post<
        undefined,
        GetExtractionsUnfinishedApiPayload
      >("extractions/unfinished");
      const unfinishedExtractionsPrevTick = unfinishedExtractions;
      unfinishedExtractions = extractionPayload.data.extractions;

      const mfaPayload = await post<undefined, GetMfaInfoApiPayload>(
        "mfa/current"
      );
      extractionMfaInfos = mfaPayload.data.mfaInfos;

      if (unfinishedExtractions.length > 0) {
        const accountsDisp = unfinishedExtractions.map((o) => {
          const account = accounts.find((p) => p._id === o.accountId);
          const startedStr = o.startedAt ? "yes" : "no";
          const finishedStr = o.finishedAt ? "yes" : "no";
          return `${account?.display} | started: ${startedStr}, finished: ${finishedStr}`;
        });

        console.log("Fetched extraction status:");
        console.log(accountsDisp.join("\n"));
      }

      const pendingCtPrev = unfinishedExtractionsPrevTick.filter(
        (o) => !o.finishedAt
      ).length;
      const pendingCt = unfinishedExtractions.filter(
        (o) => !o.finishedAt
      ).length;

      const updatedAts = unfinishedExtractions
        .map((o) => o.updatedAt)
        .join(",");
      const updatedAtsPrev = unfinishedExtractionsPrevTick
        .map((o) => o.updatedAt)
        .join(",");
      if (pendingCt !== pendingCtPrev || updatedAts !== updatedAtsPrev) {
        console.log(`Pending accounts or extractions changed; refetching data`);
        await fetchAccounts();
        await fetchTransactions(query);
        await fetchExtractions();
      }

      if (pendingCt > 0) {
        console.log(`${pendingCt} of ${accounts.length} accounts remaining`);
        await delay(1000);
        await fetchExtractionStatus();
      } else if (pendingCtPrev > 0) {
        console.log("Extraction finished!");
      } else {
        console.log("No extraction is currently in progress");
      }
    } catch (e) {
      console.log("Error fetching extraction status:", e);
      unfinishedExtractions = [];
      extractionMfaInfos = [];
    }
  };

  const onClickExtractionsHistory = async () => {
    isShowingExtractionsHistory = true;
    await fetchExtractions();
  };

  const onClickSendMfaCode = async (bankId: string, code: string) => {
    try {
      await post("mfa/code", { bankId, code });
    } catch (e) {
      console.log("Error sending mfa code:", e);
    }
  };

  const onClickExtract = async (accountIds?: UUID[]) => {
    if (!accountIds) {
      accountIds = accounts.map((o) => o._id);
    }
    await post<AddExtractionsApiArgs, undefined>("extractions/add", {
      accountIds,
    });
    await post<undefined, undefined>("extract");
    await fetchExtractionStatus();
  };

  const onChangeQuery = async (q: string) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      await fetchTransactions(q);
    }, 100);
  };

  const onKeyPress = (evt: KeyboardEvent) => {
    if (evt.metaKey && evt.key === "k") {
      evt.preventDefault();
      searchInputFieldRef.focus();
    } else if (evt.key === "Escape") {
      evt.preventDefault();
      searchInputFieldRef.value = "";
      query = "";
      searchInputFieldRef.blur();
    }
  };
</script>

<div class="container">
  <div class="content">
    <div class="header">
      <div class="row">
        <h1 style={"flex: 2"}>Finance</h1>
        <input
          id={"search-input"}
          style={"flex: 1"}
          placeholder={searchPlaceholderText}
          on:focus={() => (isSearchFocused = true)}
          on:blur={() => (isSearchFocused = false)}
          bind:value={query}
          bind:this={searchInputFieldRef}
        />
        <button on:click={() => onClickExtractionsHistory()}>
          <Icon kind={"clock"} />
        </button>
      </div>
    </div>

    {#if extractionMfaInfos.length > 0}
      <MfaInputList
        mfaInfos={extractionMfaInfos}
        onClickSend={onClickSendMfaCode}
      />
    {/if}

    <TimeChart
      {transactions}
      {transactionsTotalMaxPrice}
      {transactionsTotalEarliestDate}
      onHoverGroup={(group) => {
        hoverGroup = group;
      }}
    />

    <AccountsList
      {accounts}
      {accountsSum}
      {banks}
      {bankCredsExistMap}
      {unfinishedExtractions}
      onClickCreate={createAccount}
      onClickAccount={(id) => {
        accountIdShowingDetail = id;
      }}
      {onClickExtract}
    />

    <TransactionsList
      {transactions}
      {transactionsTotalCt}
      {transactionsSumPrice}
      activeGroup={hoverGroup}
      query={transactionsResponseQuery}
      {accountsDict}
    />
  </div>

  {#if accountShowingDetail}
    <Lightbox
      onPressDismiss={() => {
        accountIdShowingDetail = undefined;
      }}
    >
      <EditAccount
        account={accountShowingDetail}
        {banks}
        hasCredsForBank={bankCredsExistMap[accountIdShowingDetail]}
        onSubmitAccount={updateAccount}
        onSubmitBankCreds={updateBankCreds}
        onSelectDeleteAccount={deleteAccount}
      />
    </Lightbox>
  {/if}

  {#if isShowingExtractionsHistory}
    <Lightbox
      onPressDismiss={() => {
        isShowingExtractionsHistory = false;
      }}
    >
      <Extractions {extractions} {accounts} />
    </Lightbox>
  {/if}
</div>
