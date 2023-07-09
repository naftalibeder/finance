<script lang="ts">
  import { onMount } from "svelte";
  import { post } from "../api";
  import { VerifyDeviceApiArgs } from "shared";
  import { Auth, Dashboard } from ".";

  let isLoading = true;
  let isAuthenticated = false;

  onMount(async () => {
    isLoading = true;
    isAuthenticated = await checkDevice();
    isLoading = false;
  });

  const checkDevice = async (): Promise<boolean> => {
    const name = localStorage.getItem("name");
    const token = localStorage.getItem("token");
    if (!name || !token) {
      console.log("No token stored locally");
      return false;
    }

    try {
      console.log("Submitting token:", token);
      await post<VerifyDeviceApiArgs, undefined>("verifyDevice", {
        name,
        token,
      });
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
