<script lang="ts">
  // @ts-ignore
  import { SignInApiArgs, SignInApiPayload } from "shared";
  import { post } from "../api";

  export let onSuccess: () => void;

  let email = "";
  let password = "";

  const onClickSubmit = async () => {
    try {
      const payload = await post<SignInApiArgs, SignInApiPayload>("signIn", {
        email,
        password,
      });
      const { name, token } = payload;
      localStorage.setItem("name", name);
      localStorage.setItem("token", token);
      onSuccess();
    } catch (e) {
      console.log("Error signing in:", e);
    }
  };
</script>

<div class="container">
  <div class="form">
    <input type="email" placeholder="Email" bind:value={email} />
    <input type="password" placeholder="Password" bind:value={password} />
    <button type="submit" on:click={onClickSubmit}>Submit</button>
  </div>
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 1fr 300px 1fr;
    grid-template-rows: 1fr auto auto auto 1fr;
    align-content: center;
    padding: 36px;
  }

  .form {
    display: grid;
    grid-auto-flow: row;
    grid-column: 2;
    grid-row: 2;
    row-gap: 16px;
  }
</style>
