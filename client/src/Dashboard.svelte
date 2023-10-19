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
    User,
    GetUserApiPayload,
    DeleteBankCredsApiArgs,
    PaginationApiPayload,
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
    Header,
    Settings,
  } from ".";
  import { delay } from "../utils";

  const zeroPrice: Price = {
    amount: 0,
    currency: "USD",
  };

  const zeroPagination: PaginationApiPayload = {
    page: 1,
    pageItemCt: 0,
    pageItemMaxCt: 0,
    totalItemCt: 0,
    totalPageCt: 0,
  };

  let user: User | undefined;
  let banks: Bank[] = [];
  let bankCredsExistMap: Record<string, boolean> = {};
  let accounts: Account[] = [];
  let accountsSum: Price = zeroPrice;

  let isLoadingTransactions = false;
  let transactions: Transaction[] = [];
  let transactionsSumPrice: Price = zeroPrice;
  let transactionsPagination: PaginationApiPayload = zeroPagination;
  let transactionsFilterQuery = "";

  /** A list of all extractions ever completed or in progress. */
  let extractions: Extraction[] = [];
  /** A list of all extractions currently in progress. */
  let unfinishedExtractions: Extraction[] = [];
  /** Multi-factor request information for an extraction currently in progress. */
  let extractionMfaInfos: MfaInfo[] = [];

  let query = "";

  let visibleOverlay: "extractionsHistory" | "settings" | undefined;

  let accountIdShowingDetail: UUID | undefined = undefined;
  $: accountShowingDetail = accounts.find(
    (o) => o._id === accountIdShowingDetail
  );

  onMount(async () => {
    await fetchAll();
  });

  const fetchAll = async () => {
    await fetchUser();
    await fetchBanks();
    await fetchAccounts();
    await fetchTransactions(query, 1);
    await fetchExtractionStatus();
  };

  const fetchUser = async () => {
    try {
      const payload = await post<undefined, GetUserApiPayload>("user");
      user = payload.data.user;
      console.log(`Fetched user with email ${user.email}`);
    } catch (e) {
      console.log("Error fetching user:", e);
    }
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
      await fetchBanks();
    } catch (e) {
      console.log("Error updating bank credentials:", e);
    }
  };

  const deleteBankCreds = async (bankId: string) => {
    try {
      await post<DeleteBankCredsApiArgs, undefined>("banks/deleteCredentials", {
        bankId,
      });
      await fetchBanks();
    } catch (e) {
      console.log("Error deleting bank credentials:", e);
    }
  };

  const fetchTransactions = async (_query: string, page: number) => {
    if (isLoadingTransactions) {
      return;
    }

    console.log(`Fetching transactions page ${page} with query '${_query}'`);
    isLoadingTransactions = true;

    try {
      const payload = await post<
        GetTransactionsApiArgs,
        GetTransactionsApiPayload
      >("transactions", {
        query: _query,
        page,
      });
      if (page > transactionsPagination.page) {
        transactions = [...transactions, ...payload.data.items];
      } else {
        transactions = payload.data.items;
      }
      transactionsSumPrice = payload.data.itemsSum;
      transactionsPagination = payload.pagination;
      console.log(
        `Fetched ${payload.pagination.pageItemCt} of ${payload.pagination.totalItemCt} transactions with a sum of ${transactionsSumPrice.amount}`
      );
    } catch (e) {
      console.log("Error fetching transactions:", e);
    }

    transactionsFilterQuery = _query;
    isLoadingTransactions = false;
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
        await fetchTransactions(query, 1);
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

  const onClickShowMoreTransactions = async () => {
    await fetchTransactions(query, transactionsPagination.page + 1);
  };

  const onQueryChanged = async (_query: string) => {
    query = _query;
    await fetchTransactions(query, 1);
  };

  const onClickExtractionsHistory = async () => {
    visibleOverlay = "extractionsHistory";
    await fetchExtractions();
  };

  const onClickSettings = async () => {
    visibleOverlay = "settings";
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
</script>

<div class="container">
  <div class="content">
    <Header {onQueryChanged} {onClickExtractionsHistory} {onClickSettings} />

    {#if extractionMfaInfos.length > 0}
      <MfaInputList
        mfaInfos={extractionMfaInfos}
        onClickSend={onClickSendMfaCode}
      />
    {/if}

    <TimeChart {transactions} />

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
      isLoading={isLoadingTransactions}
      {transactions}
      {transactionsSumPrice}
      {transactionsPagination}
      {accounts}
      query={transactionsFilterQuery}
      onClickShowMore={onClickShowMoreTransactions}
    />
  </div>

  {#if accountShowingDetail}
    <Lightbox
      title={"Edit account"}
      onPressDismiss={() => {
        accountIdShowingDetail = undefined;
      }}
    >
      <EditAccount
        account={accountShowingDetail}
        {banks}
        onSubmitAccount={updateAccount}
        onSelectDeleteAccount={deleteAccount}
      />
    </Lightbox>
  {/if}

  {#if visibleOverlay === "extractionsHistory"}
    <Lightbox
      title={"Extraction history"}
      onPressDismiss={() => {
        visibleOverlay = undefined;
      }}
    >
      <Extractions {extractions} {accounts} />
    </Lightbox>
  {:else if visibleOverlay === "settings"}
    <Lightbox
      title={"Settings"}
      onPressDismiss={() => {
        visibleOverlay = undefined;
      }}
    >
      <Settings
        {user}
        {banks}
        {bankCredsExistMap}
        onClickSubmitBankCreds={updateBankCreds}
        onClickDeleteBankCreds={deleteBankCreds}
      />
    </Lightbox>
  {/if}
</div>

<style>
  .container {
    display: grid;
    justify-content: center;
    grid-template-columns: 1fr;
  }

  .content {
    display: grid;
    grid-template-columns: 1fr;
  }
</style>
