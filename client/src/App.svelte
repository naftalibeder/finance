<script lang="ts">
  import { onMount } from "svelte";
  import { post } from "../api";
  import Auth from "./Auth.svelte";
  import Dashboard from "./Dashboard.svelte";
  import { VerifyTokenApiArgs } from "shared";

  let isLoading = true;
  let isAuthenticated = false;

  onMount(async () => {
    isLoading = true;
    isAuthenticated = await checkToken();
    isLoading = false;
  });

  const checkToken = async (): Promise<boolean> => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No token stored locally");
      return false;
    }

    try {
      console.log("Submitting token:", token);
      await post<undefined, VerifyTokenApiArgs>("verifyToken", { token });
      return true;
    } catch (e) {
      console.log("Error verifying token:", e);
      return false;
    }
  };
</script>

{#if isLoading}
  <div />
{:else if isAuthenticated}
  <Dashboard />
{:else}
  <Auth
    onSuccess={() => {
      isAuthenticated = true;
    }}
  />
{/if}
