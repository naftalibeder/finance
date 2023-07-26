<script lang="ts">
  import { MfaInfo } from "shared";

  export let mfaInfos: MfaInfo[];
  export let onClickOption: (bankId: string, option: number) => Promise<void>;
  export let onClickSend: (bankId: string, code: string) => Promise<void>;

  let isSending = false;

  const _onClickOption = async (bankId: string, option: number) => {
    isSending = true;
    await onClickOption(bankId, option);
    isSending = false;
  };

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
        {#if mfaInfo.options}
        <div>
          <label for={mfaInfo.bankId}>{mfaInfo.bankId}</label>
          <select name="{mfaInfo.bankId}" id="{mfaInfo.bankId}" disabled={isSending}>
            {#each mfaInfo.options as option, index}
            <option value="{index}">{option}</option>
            {/each}
          </select>
        </div>
        <button
          class="outline"
          on:click={(evt) => {
            // @ts-ignore
            const option = document.getElementById(mfaInfo.bankId).value;
            _onClickOption(mfaInfo.bankId, option);
          }}
          disabled={isSending}
        >
          Select option
        </button>
        {:else}
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
        {/if}
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
