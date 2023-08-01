<script lang="ts">
  import { onMount } from "svelte";
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
    ExtractApiArgs,
    GetBanksApiPayload,
    Bank,
    BankCreds,
    UpdateBankCredsApiArgs,
    DeleteAccountApiArgs,
    GetExtractionsApiPayload,
    Extraction,
    GetExtractionStatusApiPayload,
    MfaInfo,
    // @ts-ignore
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

  let transactionsFiltered: Transaction[] = [];
  let transactionsFilteredCt = 0;
  let transactionsFilteredSumPrice: Price = zeroPrice;
  let transactionsOverallCt = 0;
  let transactionsOverallSumPrice: Price = zeroPrice;
  let transactionsOverallMaxPrice: Price = zeroPrice;
  let transactionsOverallEarliestDate: string | undefined;

  let isLoading = false;

  /** A list of all extractions ever completed or in progress. */
  let extractions: Extraction[] = [];
  /** An extraction currently in progress. */
  let extraction: Extraction | undefined;
  /** Multi-factor request information for an extraction currently in progress. */
  let extractionMfaInfos: MfaInfo[] = [];
  /** The number of unfinished accounts in the extraction currently in progress. */
  let extractionAccountsRemainingCt = 0;

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
    isLoading = true;
    await fetchAll();
    isLoading = false;
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
            timeZoneId: account.timeZoneId,
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
      const payload = await post<undefined, GetExtractionStatusApiPayload>(
        "status"
      );
      extraction = payload.data.extraction;
      extractionMfaInfos = payload.data.mfaInfos;

      const display: Record<string, string> = {};
      for (const [k, v] of Object.entries(payload.data.extraction.accounts)) {
        display[accountsDict[k].display] = JSON.stringify(v);
      }
      console.log("Extraction status:", JSON.stringify(display, undefined, 2));

      const remainingCt = Object.values(extraction.accounts).filter(
        (o) => !o.finishedAt
      ).length;
      if (remainingCt !== extractionAccountsRemainingCt) {
        await fetchAccounts();
        await fetchTransactions(query);
      }
      extractionAccountsRemainingCt = remainingCt;
      if (remainingCt > 0) {
        await delay(1000);
        await fetchExtractionStatus();
      }
    } catch (e) {
      console.log("Error fetching extraction status:", e);
    }
  };

  const onClickExtractionsHistory = async () => {
    isShowingExtractionsHistory = true;

    try {
      const payload = await post<undefined, GetExtractionsApiPayload>(
        "extractions"
      );
      extractions = payload.data.extractions;
    } catch (e) {
      console.log("Error getting extractions:", e);
    }
  };

  const onClickMfaOption = async (bankId: string, option: number) => {
    try {
      await post("mfa/option", { bankId, option });
    } catch (e) {
      console.log("Error sending mfa option:", e);
    }
  };

  const onClickSendMfaCode = async (bankId: string, code: string) => {
    try {
      await post("mfa", { bankId, code });
    } catch (e) {
      console.log("Error sending mfa code:", e);
    }
  };

  const onClickExtract = async (accountIds?: UUID[]) => {
    await post<ExtractApiArgs, undefined>("extract", { accountIds });
    await fetchExtractionStatus();
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
        onClickOption={onClickMfaOption}
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
      {banks}
      {extraction}
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
      <EditAccount
        account={accountShowingDetail}
        {banks}
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
