<script lang="ts">
  import { MfaInfo } from "shared";

  export let mfaInfos: MfaInfo[];
  export let onClickSend: (bankId: string, code: string) => Promise<void>;

  let isSending = false;

  const _onClickSend = async (bankId: string, code: string) => {
    isSending = true;
    await onClickSend(bankId, code);
    isSending = false;
  };
</script>

<div class="section">
  <div class="outline-box">
    {#each mfaInfos as mfaInfo}
      <div class="row">
        <div>
          <label for={mfaInfo.bankId}>{mfaInfo.bankId}</label>
          <input
            id={mfaInfo.bankId}
            placeholder={isSending ? "Sending..." : "Enter code"}
            disabled={isSending}
          />
        </div>
        <button
          class="outline"
          on:click={(evt) => {
            // @ts-ignore
            const code = document.getElementById(mfaInfo.bankId).value;
            _onClickSend(mfaInfo.bankId, code);
          }}
          disabled={isSending}
        >
          Send code
        </button>
      </div>
    {/each}
  </div>
</div>

<style>
  .section {
    padding: 0px var(--gutter);
  }

  .outline-box {
    outline: var(--text-red) 1px solid;
    outline-offset: 12px;
  }

  .row {
    justify-content: space-between;
  }
</style>
